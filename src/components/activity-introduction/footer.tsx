import React from "react";
import { ProjectTypes, DefaultFooter } from "../../utilities/project-utils";
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
    const footer = projectType?.footer || DefaultFooter;
    const footerLogos = projectType?.footerLogo || [];

    return (
      <div className="footer" data-cy="footer">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className="footer-text">
            { renderHTML(footer) }
          </div>
          <div className="footer-logo-container" data-cy="footer-logo-container">
            {footerLogos.map((logo: any, i: number) =>
              <img key={i} src={logo} className="footer-logo" data-cy="partner-logo" />
            )}
          </div>
        </div>
      </div>
    );
  }
}
