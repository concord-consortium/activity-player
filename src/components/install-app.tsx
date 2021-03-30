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
  installedApplicationUrls: {success: boolean; url: string}[];
  installedContentUrls: {success: boolean; url: string}[];
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
        loadingOfflineManifest: false,
        installedApplicationUrls: [],
        installedContentUrls: []
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
      offlineManifestId,
      installedApplicationUrls: [],
      installedContentUrls: []
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

  addInstalledApplicationUrl(success:boolean, url:string) {
    this.setState((prevState) => {
      const updatedUrls = prevState.installedApplicationUrls.concat([{success, url}]);
      return {installedApplicationUrls: updatedUrls};
    });
  }

  addInstalledContentUrl(success:boolean, url:string) {
    this.setState((prevState) => {
      const updatedUrls = prevState.installedContentUrls.concat([{success, url}]);
      return {installedContentUrls: updatedUrls};
    });
  }

  cacheApplication() {
    const wbManifest = (window as any).__wbManifest;

    // FIXME: this caching is going to happen after the initial page load
    // that means that the manifest.json and index.html will be requested by
    // Chrome before they are cached. The manifest.json is referened by
    // install.html so the user can add the app to their computer from the
    // install.html page.  The manifest.json references index.html in its
    // start_url field.
    // The index.html request comes from Chrome's new installable detection that
    // makes an offline request to the start_url:
    //   https://goo.gle/improved-pwa-offline-detection
    // The best solution to this would be to somehow indicate to Chrome that
    // we aren't ready to be used offline until the app has been cached.
    // The only way I can find to do that is the block the service worker in the
    // installing state. If the service worker is not active, then Chrome will
    // not try to make the offline start_url request.
    // But I don't think we can do that, because we need to block it while we
    // send it the manifest from the page. I don't think the page can talk
    // to the service worker while it is installing. We should test that.
    //
    // Alternative we could have the service worker respond with a fake index.html
    // so Chrome will be happy, but really the app won't be installed at this
    // point. So the page would have to say something to that effect.
    //
    //
    // There is this event:
    //   https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent
    // which is sent when Chrome determines the PWA can be installed. But it
    // isn't possible to reject it or tell Chrome we aren't ready yet.
    //
    // We don't have to worry about this immediately because it isn't enforced
    // until Chrome 93 which is due August 2021. It is just annoying to see the
    // errors in the network log.
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
        this.addInstalledApplicationUrl(true, url);
      },
      onUrlCacheFailed: (url, err) => {
        console.error(`failed to cache ${url}`, err);
        this.addInstalledApplicationUrl(false, url);
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
    const {serviceWorkerVersionInfo, offlineManifest, offlineManifestId,
      loadingOfflineManifest, installedApplicationUrls,
      installedContentUrls} = this.state;

    const installedItems = installedApplicationUrls.map(urlInfo => {
      return (
        <div key={urlInfo.url}>
          {urlInfo.success ? "" : "❌"} {urlInfo.url}
        </div>
      );
    });


    const contentItems = installedContentUrls.map(urlInfo => {
      return (
        <div key={urlInfo.url}>
          {urlInfo.success ? "" : "❌"} {urlInfo.url}
        </div>
      );
    });

    return (
      <div>
        <h1>Installing Activity Player Offline</h1>
        <div className="version-info" data-cy="version-info">
          Application: {appVersionInfo || "No Version Info"}
          {serviceWorkerVersionInfo && ` | Service Worker: ${serviceWorkerVersionInfo}`}
        </div>
        <h2>Application Files</h2>
        {installedItems}
        <h2>Content Files</h2>
        { offlineManifestId ?
          (contentItems.length > 0 ? contentItems : "waiting...") :
          "No activities specified" }
        { (offlineManifest && loadingOfflineManifest) ?
          <OfflineManifestLoadingModal offlineManifest={offlineManifest}
            workbox={this.wb}
            onUrlCached={(url: string) => this.addInstalledContentUrl(true, url)}
            onUrlCacheFailed={(url: string, err: any) => this.addInstalledContentUrl(false, url)}
            onClose={() => this.setState({loadingOfflineManifest: false})} />
          : null
        }
      </div>
    );
  }
}
