import React from "react";
import { isOfflineHost } from "../utilities/host-utils";
import { Workbox, messageSW } from "workbox-window/index";
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
  shouldStartInstalling: boolean;
}
interface IProps {
}

export class InstallApp extends React.PureComponent<IProps, IState> {
  private wb: Workbox;
  private startedInstalling = false;

  public constructor(props: IProps) {
    super(props);

    if (!isOfflineHost() || !("serviceWorker" in navigator)) {
      // Don't setup workbox
      this.state = {
        loadingOfflineManifest: false,
        installedApplicationUrls: [],
        installedContentUrls: [],
        shouldStartInstalling: false
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
      installedContentUrls: [],
      shouldStartInstalling: false
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

    this.wb.addEventListener("activated", (event) => {
      // Notes on when this fires:
      // 1. On Page Load: this only fires if there isn't an active service worker.
      //    So it will only fire the first time a user visits the page.
      // 2. On SW Update: This will also fire when the page is already loaded and
      //    a new version of the service worker becomes active.  In this case
      //    Workbox is supposed to tell us with `event.isUpdate`
      if (event.isUpdate) {
        console.log("Workbox found an updated service worker has activated.");
        if (!event.sw) {
          // This should not happen
          console.error("Worbox activated event without sw.", event);
          this.setState({serviceWorkerVersionInfo: "Unknown worker activated..."});
        } else {
          this.getSWVersionInfoAndUpdateState(event.sw);
        }
      } else {
        console.log("Workbox found the initial service worker has activated.");
      }
    });

    navigator.serviceWorker.ready.then(registration => {
      console.log("Browser says service worker is ready.");

      // This promise should resolve on every page load once the service
      // work becomes active.  If the page is loaded in a way without a SW then
      // it would never resolve.

      // The registration.active is supposed to be set based on the docs for the ready
      // promise: https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/ready
      if (registration.active) {
        this.getSWVersionInfoAndUpdateState(registration.active);
      } else {
        console.error("browser did not provide the active service worker");
      }
    });

    this.wb.register().then((_registration) => {
      console.log("Workbox register() promise resolved", _registration);
    });
  }

  async getSWVersionInfoAndUpdateState(sw: ServiceWorker) {
    this.setState({serviceWorkerVersionInfo: "Checking..."});

    const serviceWorkerVersionInfo = await this.getSWVersionInfo(sw);
    this.setState({serviceWorkerVersionInfo});
    if (serviceWorkerVersionInfo === __VERSION_INFO__) {
      this.setState({shouldStartInstalling: true});
    }
  }

  async getSWVersionInfo(sw: ServiceWorker): Promise<string> {
    try {
      const versionInfo = await messageSW(sw, {type: "GET_VERSION_INFO"});
      console.log("got service worker version info", versionInfo);
      if (typeof versionInfo === "string") {
        return versionInfo as string;
      } else {
        return "Invalid response!";
      }
    } catch (error) {
      return "No response!";
    }
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

  async cacheApplication() {
    // double check we haven't already started
    if (this.startedInstalling) {
      return;
    }

    this.startedInstalling = true;
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
      entries: wbManifest,
      onCachingStarted: (urls) => {
        console.log("started caching application");
      },
      onUrlCached: (url) => {
        this.addInstalledApplicationUrl(true, url);
      },
      onUrlCacheFailed: (url, err) => {
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
    const {serviceWorkerVersionInfo, offlineManifest, offlineManifestId,
      loadingOfflineManifest, installedApplicationUrls,
      installedContentUrls, shouldStartInstalling} = this.state;

    if (shouldStartInstalling && !this.startedInstalling) {
      this.cacheApplication();
    }

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
          Application: {__VERSION_INFO__}
          {serviceWorkerVersionInfo && ` | Service Worker: ${serviceWorkerVersionInfo}`}
        </div>
        <div>
          { !shouldStartInstalling && "Waiting for service worker to update..." }
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
