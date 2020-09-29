import React from "react";
import ccLogo from "../../assets/cc-logo.png";
import { ProjectTypes } from "../../utilities/project-utils";
import { AccountOwner } from "./account-owner";
import { CustomSelect } from "../custom-select";
import AssignmentIcon from "../../assets/svg-icons/assignment-icon.svg";
import { Logo } from "./logo";

import "./header.scss";

interface IProps {
  fullWidth?: boolean;
  projectId: number | null;
  userName: string;
  activityName: string;
  singlePage: boolean;
  showSequence?: boolean;
}

export class Header extends React.PureComponent<IProps> {
  render() {
    const ccLogoLink = "https://concord.org/";
    const { fullWidth, projectId, userName, singlePage } = this.props;
    const projectType = ProjectTypes.find(pt => pt.id === projectId);
    const logo = projectType?.headerLogo || ccLogo;
    const projectURL = projectType?.url || ( logo === ccLogo ? ccLogoLink : undefined );

    return (
      <div className="activity-header" data-cy="activity-header">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className="header-left">
            {<Logo logo={logo} url={projectURL}/>}
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


  private renderActivityMenu = () => {
    const { activityName, showSequence } = this.props;
    return (
      <React.Fragment>
        <div className="activity-title" data-cy ="activity-title">
          { showSequence ? "Sequence:" : "Activity:" }
        </div>
        <CustomSelect
          items={[activityName]}
          HeaderIcon={AssignmentIcon}
          isDisabled={true}
        />
      </React.Fragment>
    );
  }
}
