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
  ariaLabel?: string;
}

export class ActivityNav extends React.PureComponent <IProps> {
  render() {
    const { activityId, activityPages, currentPage, fullWidth, lockForwardNav, onPageChange, singlePage, usePageNames,
            hideNextPrevButtons, isSequence, ariaLabel = "Page navigation" } = this.props;
    // Single-page layouts have no page-navigation UI, so don't emit an empty
    // navigation landmark (it would confuse screen readers and fail landmark
    // audits). Keep a plain wrapper div to preserve layout, matching the
    // pre-landmark markup.
    if (singlePage) {
      return <div className={`activity-nav ${fullWidth ? "full" : ""}`} data-cy="activity-nav-header" />;
    }
    return (
      <nav className={`activity-nav ${fullWidth ? "full" : ""}`} aria-label={ariaLabel} data-cy="activity-nav-header">
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
      </nav>
    );
  }
}
