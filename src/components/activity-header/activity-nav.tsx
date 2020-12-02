import React from "react";
import { Page } from "../../types";
import { NavPages } from "./nav-pages";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";

import "./activity-nav.scss";

interface IProps {
  activityPages: Page[];
  currentPage: number;
  fullWidth?: boolean;
  onPageChange: (page: number) => void;
  singlePage: boolean;
  sequenceName?: string;
  onShowSequence?: () => void;
  lockForwardNav?: boolean;
}

export class ActivityNav extends React.PureComponent <IProps> {
  render() {
    const { activityPages, currentPage, fullWidth, lockForwardNav, onPageChange, singlePage, sequenceName, onShowSequence} = this.props;
    return (
      <div className={`activity-nav ${fullWidth ? "full" : ""}`} data-cy="activity-nav-header">
        { sequenceName &&
          <div className="sequence-name" data-cy="activity-nav-sequence-name" onClick={onShowSequence}>
            <IconChevronLeft
              width={32}
              height={32}
              fill={"white"}
            />
            {sequenceName}
          </div>
        }
        { !singlePage &&
          <NavPages
            pages={activityPages}
            onPageChange={onPageChange}
            currentPage={currentPage}
            lockForwardNav={lockForwardNav}
          />
        }
      </div>
    );
  }
}
