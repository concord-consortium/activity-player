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
            {renderHTML(footer)}
          </div>
          <div className="footer-logo-container">
            {footerLogos.length > 0 ? footerLogos.map((logo: any, i: number) => 
              <img key={i} src={logo} className="footer-logo" data-cy="partner-logo" />
              ) 
              : ""
            }
          </div>
        </div>
      </div>
    );
  }
}
