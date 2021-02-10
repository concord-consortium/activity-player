import React from "react";

import "./offline-nav.scss";

interface IProps {
  fullWidth?: boolean;
  onShowLaunchList: () => void;
}

export class OfflineNav extends React.PureComponent<IProps> {
  render() {
    const { fullWidth, onShowLaunchList } = this.props;
    const handleShowLaunchList = () => onShowLaunchList();

    return (
      <div className="offline-nav" data-cy="offline-nav">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className="nav-center">
            You are running offline (need better message here...)
          </div>
          <div className="nav-right">
            <button onClick={handleShowLaunchList}>Launch a different activity...</button>
          </div>
        </div>
      </div>
    );
  }
}
