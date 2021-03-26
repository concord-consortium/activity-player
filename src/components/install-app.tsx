import React from "react";
import { isOfflineHost } from "../utilities/host-utils";
import { Workbox } from "workbox-window/index";
import { cacheOfflineManifest } from "../offline-manifest-api";
import { OfflineManifest } from "../types";
import queryString from "query-string";

interface IState {
  serviceWorkerVersionInfo?: string;
}
interface IProps {
}

export class InstallApp extends React.PureComponent<IProps, IState> {
  private wb: Workbox;


  public constructor(props: IProps) {
    super(props);

    if (!isOfflineHost() || !("serviceWorker" in navigator)) {
      // Don't setup workbox
      this.state = {};
      return;
    }

    this.state = {
      serviceWorkerVersionInfo: "Starting..."
    };

    this.wb = new Workbox("service-worker.js");

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
      // if (entry.revision) {
      //   const parsedUrl = queryString.parseUrl(entry.url);
      //   parsedUrl.query.__WB_REVISION__ = entry.revision;
      //   return queryString.stringifyUrl(parsedUrl);
      // } else {
      //   return entry.url;
      // }
      return entry.url;
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
    const {serviceWorkerVersionInfo} = this.state;

    return (
      <div>
        <div >Hello from Install Component</div>
        <div className="version-info" data-cy="version-info">
          Application: {appVersionInfo || "No Version Info"}
          {serviceWorkerVersionInfo && ` | Service Worker: ${serviceWorkerVersionInfo}`}
        </div>
      </div>
    );
  }
}
