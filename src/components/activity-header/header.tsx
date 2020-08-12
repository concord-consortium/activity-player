import React from "react";
import ccLogo from "../../assets/cc-logo.png";
import { ProjectTypes } from "../../utilities/project-utils";
import { AccountOwnerDiv } from "./account-owner";
import { CustomSelect } from "../custom-select";
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
    const logo = (projectType?.headerLogo) || ccLogo;
    const projectURL = projectType?.url || ccLogoLink;
    const linkClass = projectURL ? "" : "no-link";
    return (
      <div className="activityHeader" data-cy="header">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className={`headerLeft ${linkClass}`} onClick={this.handleProjectLogoClick(projectURL)}>
            {logo && <img src={logo} className="project-logo" data-cy="project-logo" />}
          </div>
          <div className={`headerCenter`}>
            {!singlePage && this.renderActivityMenu()}
          </div>
          <div className={`headerRight`}>
            <AccountOwnerDiv userName={userName} />
          </div>
        </div>
      </div>
    );
  }

  private handleProjectLogoClick = (url: string) => () => {
    if (url) {
      window.open(url);
    }
  }

  private renderActivityMenu = () => {
    const { activityName } = this.props;
    return (
      <React.Fragment>
        <div className={`activityTitle`}>Activity:</div>
        <CustomSelect
          items={[activityName]}
          onSelectItem={(item: any) => console.log(item)}
          HeaderIcon={AssignmentIcon}
          isHeader={true}
          isDisabled={false}
        />
      </React.Fragment>
    );
  }
}
