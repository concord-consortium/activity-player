import React from "react";
import { cacheOfflineManifest } from "../offline-manifest-api";
import { OfflineManifest } from "../types";
import { Workbox } from "workbox-window/index";

import "./offline-manifest-loading-modal.scss";

interface IProps {
  offlineManifest: OfflineManifest;
  onClose: () => void;
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
        this.props.onCachingFinished?.();
      }
    });
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
          Finished {message} <strong>{offlineManifest.name}</strong> assets.
        </div>
        {numFailedUrls > 0
          ?
            <>
              <div>Sorry, some files failed to install. Close the dialog to see the details.</div>
              <div>{numFailedUrls} assets failed to load</div>
              <div><button onClick={() => this.props.onClose()}>Close</button></div>
            </>
          : <>
              <div>All assets have been installed!</div>
              <div>
                To access activities on a Mac, install the <strong>Activity Player</strong> app:
              </div>
              <ol>
                <li>
                  Click the <strong>Install</strong> icon to the right of your browser’s address bar.
                </li>
                <li>
                  In the prompt, click the <strong>Install</strong> button.
                  <em><br/><br/>
                    The <strong>Activity Player</strong> app window will open with these instructions. Also, the app icon — a light bulb — will be placed in the Dock.
                  </em><br/><br/>
                </li>
                <li>
                  Find the light bulb icon in the Dock.
                </li>
                <li>
                  Right-click on the icon and select <strong>Options &gt; Keep in Dock.</strong>
                  <em><br/><br/>
                    The <strong>Activity Player</strong> app can now be opened using this light bulb icon.
                  </em><br/><br/>
                </li>
                <li>
                  <strong>To access activities:</strong> close this <strong>Activity Player</strong> app window and then re-open it using the light bulb icon in the Dock.
                  <em><br/><br/>
                    Note: upon re-opening the <strong>Activity Player</strong> app, these instructions will
                    be replaced with a list of activities.
                  </em><br/><br/>
                </li>
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
