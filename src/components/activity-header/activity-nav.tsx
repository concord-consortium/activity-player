import React from "react";
import { Page } from "../../types";
import { NavPages } from "./nav-pages";

import "./activity-nav.scss";

interface IProps {
  activityId?: number | null;
  activityPages: Page[];
  currentPage: number;
  fullWidth?: boolean;
  onPageChange: (page: number) => void;
  singlePage: boolean;
  lockForwardNav?: boolean;
  usePageNames?: boolean;
  hideNextPrevButtons?: boolean;
  isSequence?: boolean;
}

export class ActivityNav extends React.PureComponent <IProps> {
  render() {
    const { activityId, activityPages, currentPage, fullWidth, lockForwardNav, onPageChange, singlePage, usePageNames,
            hideNextPrevButtons, isSequence } = this.props;
    return (
      <div className={`activity-nav ${fullWidth ? "full" : ""}`} data-cy="activity-nav-header">
        { !singlePage &&
          <NavPages
            activityId={activityId}
            pages={activityPages}
            onPageChange={onPageChange}
            currentPage={currentPage}
            lockForwardNav={lockForwardNav}
            usePageNames={usePageNames}
            hideNextPrevButtons={hideNextPrevButtons}
            isSequence={isSequence}
          />
        }
      </div>
    );
  }
}
