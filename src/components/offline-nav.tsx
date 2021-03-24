import React from "react";
import IconHome from "../assets/svg-icons/icon-home.svg";

import "./offline-nav.scss";

interface IProps {
  onOfflineActivities: () => void;
}

export class OfflineNav extends React.PureComponent<IProps> {
  render() {
    return (
      <div className="offline-nav" data-cy="offline-nav">
        <div className="inner" onClick={this.props.onOfflineActivities}>
          <IconHome className="icon" width={28} height={28} />
          Offline Activities
        </div>
      </div>
    );
  }
}
