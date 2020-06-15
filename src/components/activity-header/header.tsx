import React from "react";
import ccLogo from "../../assets/cc-logo.png";
import projectLogo from "../../assets/concord.png";

import './header.scss';

interface IProps {
  projectId?: number;
}

export class Header extends React.PureComponent <IProps> {
  render() {
    const logo = this.props.projectId !== undefined ? projectLogo : undefined;
    return (
      <div className="header" data-cy="header">
        <div className="inner">
          <div className="left">
            { logo && <img src={logo} className="project-logo" data-cy="project-logo" /> }
          </div>
          <div className="right">
            <img src={ccLogo} className="logo" />
          </div>
        </div>
      </div>
    );
  }
}
