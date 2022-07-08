import React from "react";
import { Project } from "../../types";
import { renderHTML } from "../../utilities/render-html";

import "./footer.scss";

interface IProps {
  fullWidth?: boolean;
  project?: Project | null;
}

export class Footer extends React.PureComponent<IProps> {
  render() {
    const { fullWidth, project } = this.props;
    const currentYear = new Date().getFullYear();
    const defaultFooter = `<p><span>Copyright &copy; ${currentYear} <a href="https://concord.org" title="The Concord Consortium" rel="noreferrer" target="_blank">The Concord Consortium</a>. All rights reserved. This material is licensed under a <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer" target="_blank">Creative Commons Attribution 4.0 License</a>. The software is licensed under <a href="http://opensource.org/licenses/BSD-2-Clause" rel="noreferrer" target="_blank">Simplified BSD</a>, <a href="http://opensource.org/licenses/MIT" rel="noreferrer" target="_blank">MIT</a> or <a href="http://opensource.org/licenses/Apache-2.0" rel="noreferrer" target="_blank">Apache 2.0</a> licenses. Please provide attribution to the Concord Consortium and the URL <a href="https://concord.org/" title="The Concord Consortium" rel="noreferrer" target="_blank">http://concord.org</a>.</span></p>`;
    const footer = project?.footer || defaultFooter;

    return (
      <div className="footer" data-cy="footer">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className="footer-text">
            { renderHTML(footer) }
          </div>
        </div>
      </div>
    );
  }
}
