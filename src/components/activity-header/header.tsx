import React from "react";
import { ProjectTypes } from "../../utilities/project-utils";
import { AccountOwner } from "./account-owner";
import { Logo } from "./logo";
import SequenceBackIcon from "../../assets/svg-icons/arrow-back-icon.svg";

import "./header.scss";

interface IProps {
  fullWidth?: boolean;
  projectId: number | null;
  userName: string;
  contentName: string;
  showSequence?: boolean;
  onShowSequence?: () => void;
  skipTitlePrefix?: boolean;
}

export class Header extends React.PureComponent<IProps> {
  render() {
    const ccLogoLink = "https://concord.org/";
    const { fullWidth, projectId, userName, showSequence, onShowSequence } = this.props;
    const projectType = ProjectTypes.find(pt => pt.id === projectId);
    const logo = projectType?.headerLogo;
    const projectURL = projectType?.url || ccLogoLink;
    return (
      <div className={`activity-header ${showSequence ? "in-sequence" : ""}`} data-cy="activity-header">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className="header-left">
            <Logo logo={logo} url={projectURL} />
            <div className="separator" />
          </div>
          <div className="header-center">
            <div className={`title-container ${showSequence && onShowSequence ? "link" : ""}`} onClick={onShowSequence}>
              {showSequence && onShowSequence && <SequenceBackIcon className="sequence-icon" />}
              {this.renderContentTitle()}
            </div>
          </div>
          <div className="header-right">
            <AccountOwner userName={userName} />
          </div>
        </div>
      </div>
    );
  }

  private renderContentTitle = () => {
    const { contentName, showSequence, skipTitlePrefix } = this.props;
    const titlePrefix = skipTitlePrefix ? "" : (showSequence ? "Sequence: " : "Activity: ");
    return (
      <div className="activity-title" data-cy ="activity-title">
        {`${titlePrefix}${contentName}`}
      </div>
    );
  }
}
