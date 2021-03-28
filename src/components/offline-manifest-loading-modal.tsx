import React from "react";
import { cacheOfflineManifest } from "../offline-manifest-api";
import { OfflineManifest } from "../types";
import { Workbox } from "workbox-window/index";

import "./offline-manifest-loading-modal.scss";

interface IProps {
  offlineManifest: OfflineManifest;
  onClose?: () => void;
  showOfflineManifestInstallConfirmation: boolean;
  workbox?: Workbox;
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
      },
      onUrlCached: (url) => {
        this.setState((prevState) => ({urlsCached: prevState.urlsCached.concat(url)}));
      },
      onUrlCacheFailed: (url, err) => {
        console.error("Failed to cache:", url);
        this.setState((prevState) => ({urlsFailedToCache: prevState.urlsFailedToCache.concat(url)}));
      },
      onCachingFinished: () => {
        this.setState({caching: false});
        this.checkForAutoClose(this.props);
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
              <div>Sorry, you cannot continue.</div>
              <div>{numFailedUrls} assets failed to load</div>
            </>
          : <div>Everything is installed!</div>
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
