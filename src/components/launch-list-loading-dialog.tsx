import React from "react";
import { cacheLaunchList } from "../launch-list-api";
import { LaunchList } from "../types";
import { OnlineStatus } from "./app";

import "./launch-list-loading-dialog.scss";

interface IProps {
  launchList: LaunchList;
  online: OnlineStatus;
  onClose: () => void;
}

interface IState {
  urlsToCache: string[];
  urlsCached: string[];
  urlsFailedToCache: string[];
  caching: boolean;
}

export class LaunchListLoadingDialog extends React.Component<IProps, IState> {
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
    const { launchList } = this.props;

    cacheLaunchList({
      launchList,
      onCachingStarted: (urls) => {
        this.setState({urlsToCache: urls});
      },
      onUrlCached: (url) => {
        this.setState((prevState) => ({urlsCached: prevState.urlsCached.concat(url)}));
      },
      onUrlCacheFailed: (url, err) => {
        this.setState((prevState) => ({urlsFailedToCache: prevState.urlsFailedToCache.concat(url)}));
      },
      onAllUrlsCached: () => {
        this.setState({caching: false});
        this.checkForAutoClose(this.props);
      },
      onAllUrlsCacheFailed: (err) => {
        this.setState({caching: false});
      }
    });
  }

  UNSAFE_componentWillReceiveProps(nextProps: IProps) {
    this.checkForAutoClose(nextProps);
  }

  checkForAutoClose(props: IProps) {
    if (!this.state.caching && (this.state.urlsFailedToCache.length === 0) && (props.online === "yes")) {
      // allow the final render
      setTimeout(() => props.onClose(), 0);
    }
  }

  renderOnlineStatus() {
    const {online} = this.props;

    return (
      <div>
        Online: {online === "checking" ? "Checking ..." : (online === "yes" ? "Yes" : "No")}
      </div>
    );
  }

  renderCaching() {
    const { launchList } = this.props;
    const { urlsToCache, urlsCached, urlsFailedToCache} = this.state;

    return (
      <>
        <div>
          Loading <strong>{launchList.name}</strong> assets...
        </div>
        <div>
          {urlsCached.length + urlsFailedToCache.length} of {urlsToCache.length}
        </div>
        {urlsFailedToCache.length > 0
          ? <div>{urlsFailedToCache.length} failed to load!</div>
          : undefined
        }
      </>
    );
  }

  renderDoneCaching() {
    const { onClose, launchList, online } = this.props;
    const handleClose = () => onClose();
    const numFailedUrls = this.state.urlsFailedToCache.length;
    const message = numFailedUrls === 0 ? "loading" : "attempting to load";

    return (
      <>
        <div>
          Finished {message} <strong>{launchList.name}</strong> assets
        </div>
        {numFailedUrls > 0
          ? (
              <>
                <div>Sorry, you cannot continue.</div>
                <div>{numFailedUrls} assets failed to load</div>
              </>
            )
          : (online === "no"
              ? <div><button onClick={handleClose} data-cy="modal-dialog-close">Continue working offline</button></div>
              : undefined
            )
        }
      </>
    );
  }

  render() {
    const { caching } = this.state;
    return (
      <div className="launch-list-loading-dialog" data-cy="launch-list-loading-dialog">
        <div className="background" />
        <div className="dialog">
          {this.renderOnlineStatus()}
          {caching ? this.renderCaching() : this.renderDoneCaching()}
        </div>
      </div>
    );
  }
}
