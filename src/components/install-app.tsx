import React from "react";
import { isOfflineHost } from "../utilities/host-utils";
import { Workbox } from "workbox-window/index";
import queryString from "query-string";
import { getOfflineManifest, saveOfflineManifestToOfflineActivities,
  cacheUrlsWithProgress } from "../offline-manifest-api";
import { OfflineManifest } from "../types";
import { OfflineManifestLoadingModal } from "./offline-manifest-loading-modal";
import { queryValue } from "../utilities/url-query";

interface IState {
  serviceWorkerVersionInfo?: string;
  loadingOfflineManifest: boolean;
  offlineManifest?: OfflineManifest;
  offlineManifestId?: string;
}
interface IProps {
}

export class InstallApp extends React.PureComponent<IProps, IState> {
  private wb: Workbox;


  public constructor(props: IProps) {
    super(props);

    if (!isOfflineHost() || !("serviceWorker" in navigator)) {
      // Don't setup workbox
      this.state = {
        loadingOfflineManifest: false
      };
      // TODO: show some useful message incase some one loads this page from a
      // non offline host, or in a browser without service worker support
      return;
    }

    const offlineManifestId = queryValue("offlineManifest");
    const loadingOfflineManifest = !!offlineManifestId;

    this.state = {
      serviceWorkerVersionInfo: "Starting...",
      loadingOfflineManifest,
      offlineManifestId
    };

    this.wb = new Workbox("service-worker.js");

    this.wb.addEventListener("waiting", (event) => {
      // TODO: in future work we should show a dialog using this recipe:
      // https://developers.google.com/web/tools/workbox/guides/advanced-recipes#offer_a_page_reload_for_users
      // For now just send a message to skip waiting so we don't have to do it manually in the devtools
      // This will trigger a 'controlling' event which we are listening for below and reload the page when
      // we get it
      this.wb.messageSkipWaiting();
    });

    navigator.serviceWorker.ready.then(registration => {
      // Cache the application as soon as there is an active service worker
      // it doesn't matter if the serivce worker is controlling the page because
      // the fetches are done by the service worker not the page
      this.cacheApplication();
    });

    this.wb.register().then((_registration) => {
      console.log("Workbox register() promise resolved", _registration);

      console.log("Sending GET_VERSION_INFO to service worker...");
      this.setState({serviceWorkerVersionInfo: "Checking..."});
      this.wb.messageSW({type: "GET_VERSION_INFO"})
        .then((versionInfo: unknown) => {
          if (typeof versionInfo === "string") {
            this.setState({serviceWorkerVersionInfo: versionInfo});
          } else {
            this.setState({serviceWorkerVersionInfo: "Invalid response!"});
          }
        })
        .catch(() => {
          this.setState({serviceWorkerVersionInfo: "No response!"});
        });
    });
  }

  cacheApplication() {
    const wbManifest = (window as any).__wbManifest;

    // FIXME: this caching is going to happen after the initial page load
    // that means that the manifest.json and index.html will be requested by
    // Chrome as it parses the manifest.
    // The index.html request comes from Chrome's new installable detection that
    // makes an offline request to the start_url in the manifest:
    //   https://goo.gle/improved-pwa-offline-detection
    // The best solution to this is to somehow indicate to Chrome that
    // we aren't ready to be used offline until the app has been cached.
    // I'm not sure if there is a way to do that.
    const appUrls = wbManifest.map((entry: {revision: null | string; url: string}) => {
      // Add Worbox's standard __WB_REVISION__ to the files. The service worker
      // strips this out from the key used in cache storage, but it is used when
      // fetching the asset.  This prevents some caching problems when the url
      // is fetched. The service worker does use `cache: "no-store"` so the
      // browser disk cache should not be used during the install of the assets
      // but cloudfront could still be caching them, so having these revisions
      // should help avoid caching issues from CloudFront
      if (entry.revision) {
        const parsedUrl = queryString.parseUrl(entry.url);
        parsedUrl.query.__WB_REVISION__ = entry.revision;
        return queryString.stringifyUrl(parsedUrl);
      } else {
        return entry.url;
      }
    });

    // It is not clear why, but it seems like the service worker only handles one
    // CACHE_URLS_WITH_PROGRESS at time. The next message seems to get queued
    // until the first is complete. Perhaps because it calls event.waitUntil
    // We are starting the request for caching the offline manifest after this
    // caching of the application files. But we aren't doing an await or promise
    // so in theory they might start synchronously. But it seems like the
    // service worker is serializing the messages
    //
    // TODO: show something in the UI while the application files are caching
    cacheUrlsWithProgress({
      workbox: this.wb,
      urls: appUrls,
      onCachingStarted: (urls) => {
        console.log("stared caching application");
      },
      onUrlCached: (url) => {
        console.log(`cached url ${url}`);
      },
      onUrlCacheFailed: (url, err) => {
        console.error(`failed to cache ${url}`, err);
      },
      onCachingFinished: () => {
        console.log("finished caching application");
      },
    });

    const {offlineManifestId} = this.state;
    if (offlineManifestId) {
      // The offline manifest is the list of files for the activities needed
      // offline. Currently this offline manifest file itself is not put into cache
      // storage by the service worker. The saveOfflineManifestToOfflineActivities
      // adds information about the manifest to local storage.
      // The setting of the offlineManifest in the state triggers the loading
      // of the OfflineManifestLoadingModal which then triggers a call
      // similiar to cacheUrlsWithProgress but with the urls from the offline manifest
      getOfflineManifest(offlineManifestId)
        .then(async (offlineManifest) => {
          console.log("got offlineManifest", offlineManifest);
          if (offlineManifest) {
            await saveOfflineManifestToOfflineActivities(offlineManifest);
            this.setState({offlineManifest});
          }
        })
        .catch(error => {
          console.error(error);
        });
    }
  }

  render() {
    const appVersionInfo = (window as any).__appVersionInfo;
    const {serviceWorkerVersionInfo, offlineManifest, loadingOfflineManifest} = this.state;

    return (
      <div>
        <div >Hello from Install Component</div>
        <div className="version-info" data-cy="version-info">
          Application: {appVersionInfo || "No Version Info"}
          {serviceWorkerVersionInfo && ` | Service Worker: ${serviceWorkerVersionInfo}`}
        </div>
        { (offlineManifest && loadingOfflineManifest) ?
          <OfflineManifestLoadingModal offlineManifest={offlineManifest} showOfflineManifestInstallConfirmation={true} workbox={this.wb} />
          : null
        }
      </div>
    );
  }
}
