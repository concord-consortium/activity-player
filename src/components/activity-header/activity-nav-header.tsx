import React from "react";
import { NavMenu } from "./nav-menu";
import { NavPages } from "./nav-pages";

import "./activity-nav-header.scss";

interface IProps {
  activityName: string;
  activityPages: any[];
  currentPage: number;
  fullWidth?: boolean;
  onPageChange: (page: number) => void;
  singlePage: boolean;
}

export class ActivityNavHeader extends React.PureComponent <IProps> {
  render() {
    const { activityName, activityPages, currentPage, fullWidth, onPageChange, singlePage} = this.props;
    return (
      <div className={`activity-nav-header ${fullWidth ? "full" : ""}`} data-cy="activity-nav-header">
        <div className="left" data-cy="activity-nav-header-left">
          { !singlePage &&
            <NavMenu
              activityList={[activityName]}
            />
          }
          <div className="activity-name">{`Activity: ${activityName}`}</div>
        </div>
        { !singlePage &&
          <div className="right" data-cy="activity-nav-header-right">
            <NavPages
              pages={activityPages}
              onPageChange={onPageChange}
              currentPage={currentPage}
            />
          </div>
        }
      </div>
    );
  }
}
