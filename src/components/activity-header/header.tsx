import React from "react";
import ccLogo from "../../assets/cc-logo.png";
import { ProjectTypes } from "../../utilities/project-utils";
import { AccountOwner } from "./account-owner";
import { CustomSelect } from "../custom-select";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import AssignmentIcon from "../../assets/svg-icons/assignment-icon.svg";

import "./header.scss";

interface IProps {
  fullWidth?: boolean;
  projectId: number | null;
  userName: string;
  activityName: string;
  singlePage: boolean;
}

export class Header extends React.PureComponent<IProps> {
  render() {
    const ccLogoLink = "https://concord.org/";
    const { fullWidth, projectId, userName, singlePage } = this.props;
    const projectType = ProjectTypes.find(pt => pt.id === projectId);
    const logo = projectType?.headerLogo || ccLogo;
    const projectURL = projectType?.url || ccLogoLink;
    const linkClass = projectURL ? "" : "no-link";
    return (
      <div className="activity-header" data-cy="activity-header">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className={`header-left ${linkClass}`} onClick={this.handleProjectLogoClick(projectURL)}>
            {logo && <img src={logo} className="project-logo" alt="Project website" data-cy="project-logo" 
                      onClick={this.handleProjectLogoClick(projectURL)} onKeyDown={this.handleProjectLogoClick(projectURL)}
                      tabIndex={0}/>}
          </div>
          <div className="header-center">
            {!singlePage && this.renderActivityMenu()}
          </div>
          <div className="header-right">
            <AccountOwner userName={userName} />
          </div>
        </div>
      </div>
    );
  }

  private handleProjectLogoClick = (url: string) => () => {
    if ((accessibilityClick(event)) && url ) {
      window.open(url);
    }
  }

  private renderActivityMenu = () => {
    const { activityName } = this.props;
    return (
      <React.Fragment>
        <div className="activity-title" data-cy ="activity-title">Activity:</div>
        <CustomSelect
          items={[activityName]}
          HeaderIcon={AssignmentIcon}
          isDisabled={true}
        />
      </React.Fragment>
    );
  }
}
