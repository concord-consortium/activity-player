import React from "react";
import { isOfflineHost } from "../utilities/host-utils";
import { Workbox } from "workbox-window/index";
import queryString from "query-string";
import { getOfflineManifest, saveOfflineManifestToOfflineActivities } from "../offline-manifest-api";
import { OfflineManifest } from "../types";
import { OfflineManifestLoadingModal } from "./offline-manifest-loading-modal";
import { queryValue } from "../utilities/url-query";

interface IState {
  serviceWorkerVersionInfo?: string;
  loadingOfflineManifest: boolean;
  offlineManifest?: OfflineManifest;
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
      loadingOfflineManifest
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

        if (navigator.serviceWorker.controller) {
          // Now that we are sending this message to the service worker instead of
          // using a fetch
          this.cacheApplication();
        } else {
          console.log("service worker is not controlling page yet so we can't install files.");
        }
    });

    if (offlineManifestId) {
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

  cacheApplication() {
    const wbManifest = (window as any).__wbManifest;
    // const offlineManifest: OfflineManifest = { name: "Application Manifest", activities: [], cacheList: [] };

    // FIXME: this caching is going to happen after the initial page load
    // that means that the manifest.json and index.html will be cached by chrome as it parses the
    // manifest.  The index.html request comes from Chrome's new installable dection that makes an offline request
    // to the start_url in the manifest.
    // Not clear what the solution to that is yet.
    const appUrls = wbManifest.map((entry: {revision: null | string; url: string}) => {
      // TODO we are ignoring the revisions for now, because they require moving this code into
      // into the service worker so it know what revision to look for either when the actual page
      // requests it, or when it is making the install request and then it should not include
      // the revision param in the cached key
      if (entry.revision) {
        const parsedUrl = queryString.parseUrl(entry.url);
        parsedUrl.query.__WB_REVISION__ = entry.revision;
        return queryString.stringifyUrl(parsedUrl);
      } else {
        return entry.url;
      }
    });

    this.wb.messageSW({type: "CACHE_URLS_WITH_PROGRESS", payload: {urlsToCache: appUrls}})
      .then((response: any) => {
        console.log("url caching finished", response);
      })
      .catch(() => {
        console.error("url caching failed");
      });
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
