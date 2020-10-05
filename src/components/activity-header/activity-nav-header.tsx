import React from "react";
import { Page } from "../../types";
import { NavPages } from "./nav-pages";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";

import "./activity-nav-header.scss";

interface IProps {
  activityPages: Page[];
  currentPage: number;
  fullWidth?: boolean;
  onPageChange: (page: number) => void;
  singlePage: boolean;
  sequenceName?: string;
  onShowSequence?: () => void;
}

export class ActivityNavHeader extends React.PureComponent <IProps> {
  render() {
    const { activityPages, currentPage, fullWidth, onPageChange, singlePage, sequenceName, onShowSequence} = this.props;
    return (
      <div className={`activity-nav-header ${fullWidth ? "full" : ""}`} data-cy="activity-nav-header">
        { sequenceName &&
          <div className="sequence-name" data-cy="activity-nav-header-sequence-name" onClick={onShowSequence}>
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
          />
        }
      </div>
    );
  }
}
