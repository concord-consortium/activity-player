import React from "react";
import { NavPages } from "./nav-pages";

import "./activity-nav-header.scss";
import { Page } from "../../types";

interface IProps {
  activityName: string;
  activityPages: Page[];
  currentPage: number;
  fullWidth?: boolean;
  onPageChange: (page: number) => void;
  singlePage: boolean;
}

export class ActivityNavHeader extends React.PureComponent <IProps> {
  render() {
    const { activityPages, currentPage, fullWidth, onPageChange, singlePage} = this.props;
    return (
      <div className={`activity-nav-header ${fullWidth ? "full" : ""}`} data-cy="activity-nav-header">
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
