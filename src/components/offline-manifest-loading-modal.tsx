import React from "react";
import { cacheOfflineManifest } from "../offline-manifest-api";
import { OfflineManifest } from "../types";
import { Workbox } from "workbox-window/index";

import "./offline-manifest-loading-modal.scss";

interface IProps {
  offlineManifest: OfflineManifest;
  onClose: () => void;
  showOfflineManifestInstallConfirmation: boolean;
  workbox: Workbox;
  onCachingStarted?: (urls: string[]) => void;
  onUrlCached?: (url: string) => void;
  onUrlCacheFailed?: (url: string, err: any) => void;
  onCachingFinished?: () => void;
}

interface IState {
  urlsToCache: string[];
  urlsCached: string[];
  urlsFailedToCache: string[];
  caching: boolean;
}

export class OfflineManifestLoadingModal extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);

    this.state = {
      urlsToCache: [],
      urlsCached: [],
      urlsFailedToCache: [],
      caching: true,
    };
  }

  componentDidMount() {
    const { offlineManifest, workbox } = this.props;

    cacheOfflineManifest({
      workbox,
      offlineManifest,
      onCachingStarted: (urls) => {
        this.setState({urlsToCache: urls});
        this.props.onCachingStarted?.(urls);
      },
      onUrlCached: (url) => {
        this.setState((prevState) => ({urlsCached: prevState.urlsCached.concat(url)}));
        this.props.onUrlCached?.(url);
      },
      onUrlCacheFailed: (url, err) => {
        console.error("Failed to cache:", url);
        this.setState((prevState) => ({urlsFailedToCache: prevState.urlsFailedToCache.concat(url)}));
        this.props.onUrlCacheFailed?.(url, err);
      },
      onCachingFinished: () => {
        this.setState({caching: false});
        this.checkForAutoClose(this.props);
        this.props.onCachingFinished?.();
      }
    });
  }

  UNSAFE_componentWillReceiveProps(nextProps: IProps) {
    this.checkForAutoClose(nextProps);
  }

  checkForAutoClose(props: IProps) {
    const {caching, urlsFailedToCache} = this.state;
    const {showOfflineManifestInstallConfirmation, onClose} = this.props;
    if (onClose && !caching && (urlsFailedToCache.length === 0) && !showOfflineManifestInstallConfirmation) {
      // allow the final render
      setTimeout(() => onClose(), 0);
    }
  }

  renderCaching() {
    const { offlineManifest } = this.props;
    const { urlsToCache, urlsCached, urlsFailedToCache} = this.state;

    return (
      <>
        <div>
          Loading <strong>{offlineManifest.name}</strong> assets...
        </div>
        <div>
          {urlsCached.length + urlsFailedToCache.length} of {urlsToCache.length}
        </div>
        {urlsFailedToCache.length > 0 && <div>{urlsFailedToCache.length} failed to load!</div>}
      </>
    );
  }

  renderDoneCaching() {
    const { offlineManifest } = this.props;
    const numFailedUrls = this.state.urlsFailedToCache.length;
    const message = numFailedUrls === 0 ? "loading" : "attempting to load";

    return (
      <>
        <div>
          Finished {message} <strong>{offlineManifest.name}</strong> assets
        </div>
        {numFailedUrls > 0
          ?
            <>
              <div>Sorry, some files failed to install. Close the dialog to see the details.</div>
              <div>{numFailedUrls} assets failed to load</div>
              <div><button onClick={() => this.props.onClose()}>Close</button></div>
            </>
          : <>
              <div>Everything is installed!</div>
              <div>To Finish the install on a Mac:</div>
              <ol>
                <li>Click the install icon on the right of the browser address bar.</li>
                <li>Confirm you want to install the application.</li>
                <li>This will open these instructions in the newly installed application.</li>
                <li>Find the light bulb logo in the dock.</li>
                <li>Right click and select options, then keep in dock.</li>
                <li>Close the application.</li>
                <li>Open the application. You can now use the activities you just installed.</li>
              </ol>
            </>
        }
      </>
    );
  }

  render() {
    const { caching } = this.state;
    return (
      <div className="offline-manifest-loading-modal" data-cy="offline-manifest-loading-modal">
        <div className="background" />
        <div className="dialog">
          {caching ? this.renderCaching() : this.renderDoneCaching()}
        </div>
      </div>
    );
  }
}
