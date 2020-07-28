import React from "react";
import { ProjectTypes } from "../../utilities/project-utils";
import { renderHTML } from "../../utilities/render-html";

import "./footer.scss";

interface IProps {
  fullWidth?: boolean;
  projectId: number | null;
}

export class Footer extends React.PureComponent<IProps> {
  render() {
    const { fullWidth, projectId } = this.props;
    const projectType = ProjectTypes.find(pt => pt.id === projectId);
    const footer = projectType?.footer || "";
    const footerLogos = projectType?.footerLogo || [];

    return (
      <div className="footer" data-cy="footer">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className={`footerText`}>
            { (!projectId) || (footer === "") ? this.renderDefaultFooter() : renderHTML(footer) }
          </div>
          <div className="footer-logo-container">
            {footerLogos.map((logo: any, i: number) => 
              <img key={i} src={logo} className="footer-logo" data-cy="partner-logo" />
              ) 
            }
          </div>
        </div>
      </div>
    );
  }

  private renderDefaultFooter = () => {
    const concordURL = "https://concord.org/";
    const creativeCommonsURL = "https://creativecommons.org/licenses/by/4.0/";
    const openSourceBSDURL = "http://opensource.org/licenses/BSD-2-Clause";
    const openSourceMITURL = "http://opensource.org/licenses/MIT";
    const openSourceApacheURL = "http://opensource.org/licenses/Apache-2.0";
  
    const concordLink = <a href={concordURL} title="The Concord Consortium" rel="noreferrer" target="_blank">The Concord Consortium</a>;
    const concordLink2 = <a href={concordURL} title="The Concord Consortium" rel="noreferrer" target="_blank">http://concord.org</a>;
    const creativeCommonsLink = <a href={creativeCommonsURL} rel="noreferrer" target="_blank">Creative Commons Attribution 4.0 License</a>;
    const openSourceBSDLink = <a href={openSourceBSDURL} rel="noreferrer" target="_blank">Simplified BSD</a>;
    const openSourceMITLink = <a href={openSourceMITURL} rel="noreferrer" target="_blank">MIT</a>;
    const openSourceApacheLink = <a href={openSourceApacheURL} rel="noreferrer" target="_blank">Apache 2.0</a>;
  
    return (
      <div>
        <span>{"Copyright © 2020 "}</span>
        {concordLink}
        <span>{". All rights reserved. This material is licensed under a "}</span>
        {creativeCommonsLink}
        <span>{". The software is licensed under "}</span>
        {openSourceBSDLink}
        <span>{", "}</span>
        {openSourceMITLink}
        <span>{" or "}</span>
        {openSourceApacheLink}
        <span>{" licenses. Please provide attribution to the Concord Consortium and the URL "}</span>
        {concordLink2}
        <span>{"."}</span>
      </div>
    );
  }
}
