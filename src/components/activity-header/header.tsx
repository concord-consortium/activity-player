import React from "react";
import { Project } from "../../types";
import { AccountOwner } from "./account-owner";
import { Logo } from "./logo";
import SequenceBackIcon from "../../assets/svg-icons/arrow-back-icon.svg";
import { ReadAloudText } from "../../lib/read-aloud-code-to-refactor";

import "./header.scss";

interface IProps {
  fullWidth?: boolean;
  project?: Project | null;
  userName: string;
  contentName: string;
  showSequence?: boolean;
  onShowSequence?: () => void;
}

export class Header extends React.PureComponent<IProps> {
  render() {
    const ccLogoLink = "https://concord.org/";
    const { fullWidth, project, userName, showSequence, onShowSequence } = this.props;
    const logo = project?.logo_ap;
    const projectURL = project?.url || ccLogoLink;
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
    const { contentName, showSequence } = this.props;
    return (
      <div className="activity-title" data-cy ="activity-title">
        <ReadAloudText>{`${showSequence ? "Sequence:" : "Activity:"} ${contentName}`}</ReadAloudText>
      </div>
    );
  }
}
