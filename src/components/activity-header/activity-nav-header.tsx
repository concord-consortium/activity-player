import React from "react";
import { NavMenu } from "./nav-menu";
import { NavPages } from "./nav-pages";

import './activity-nav-header.scss';

interface IProps {
  activityName: string;
  activityPages: any[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export class ActivityNavHeader extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="activity-nav-header" data-cy="activity-nav-header">
        <div className="left" data-cy="activity-nav-header-left">
          <NavMenu
            activityList={[this.props.activityName]}
          />
          <div className="activity-name">{`Activity: ${this.props.activityName}`}</div>
        </div>
        <div className="right" data-cy="activity-nav-header-right">
          <NavPages
            pages={this.props.activityPages}
            onPageChange={this.props.onPageChange}
            currentPage={this.props.currentPage}
          />
        </div>
      </div>
    );
  }
}
