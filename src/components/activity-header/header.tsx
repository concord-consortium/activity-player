import React from "react";
import ccLogo from "../../assets/cc-logo.png";
import { ProjectTypes } from "../../utilities/project-utils";

import './header.scss';

interface IProps {
  projectId: number | null;
}

export class Header extends React.PureComponent <IProps> {
  render() {
    const projectType = ProjectTypes.find(pt => pt.id === this.props.projectId);
    const logo = projectType !== undefined ? projectType.logo : undefined;
    const projectURL = projectType !== undefined ? projectType.url : "";
    return (
      <div className="header" data-cy="header">
        <div className="inner">
          <div className="left" onClick={this.handleProjectLogoClick(projectURL)}>
            { logo && <img src={logo} className="project-logo" data-cy="project-logo" /> }
          </div>
          <div className="right" onClick={this.handleConcordLogoClick}>
            <img src={ccLogo} className="logo" />
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

  private handleConcordLogoClick = () => {
    window.open("https://concord.org/");
  }
}
