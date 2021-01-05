import React from "react";
import { ProjectTypes } from "../../utilities/project-utils";
import { AccountOwner } from "./account-owner";
import { Logo } from "./logo";

import "./header.scss";

interface IProps {
  fullWidth?: boolean;
  projectId: number | null;
  userName: string;
  contentName: string;
  showSequence?: boolean;
  sequenceLogo?: string | null;
}

export class Header extends React.PureComponent<IProps> {
  render() {
    const ccLogoLink = "https://concord.org/";
    const { fullWidth, projectId, userName, sequenceLogo } = this.props;
    const projectType = ProjectTypes.find(pt => pt.id === projectId);
    const logo = projectType?.headerLogo;
    const projectURL = projectType?.url || ccLogoLink;
    return (
      <div className="activity-header" data-cy="activity-header">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className="header-left">
            <Logo logo={logo} url={projectURL} />
            <div className="separator" />
          </div>
          <div className="header-center">
            {sequenceLogo && <img className="sequence-logo" src={sequenceLogo} />}
            {this.renderContentTitle()}
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
        {`${showSequence ? "Sequence: " : "Activity:"} ${contentName}`}
      </div>
    );
  }
}
