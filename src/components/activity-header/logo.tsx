import React from "react";
import { accessibilityClick } from "../../utilities/accessibility-helper";

import "./logo.scss";

interface IProps {
  logo: any;
  url: string | undefined;
}

export class Logo extends React.PureComponent<IProps> {
  render() {
    const { logo, url } = this.props;
    const linkClass = url ? "" : "no-link";
    const tIndex = url ? 0 : -1;

    return (
      <React.Fragment>
        { <div className={`project-logo ${linkClass}`} 
               data-cy="project-logo" 
               onClick={this.handleProjectLogoLink(url)}
               onKeyDown={this.handleProjectLogoLink(url)}
               tabIndex={tIndex} >
            <img data-cy="logo-img" className="logo-img" src={logo} alt="Project website"/>
          </div>
        }
      </React.Fragment>
    );
  }

  private handleProjectLogoLink = (url: string | undefined) => () => {
    if (url && accessibilityClick(event)) {
      window.open(url);
    }
  }
}
