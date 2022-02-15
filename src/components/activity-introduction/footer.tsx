import React from "react";
import { Project } from "../../types";
import { renderHTML } from "../../utilities/render-html";

import "./footer.scss";

interface IProps {
  fullWidth?: boolean;
  project?: Project | null;
}

interface ICollaboratorsContentProps {
  collaborators: string;
  collaboratorsImageUrl: string | null;
  fundersImageUrl: string | null;
  projectTitle: string | null;
}

interface ICopyrightContentProps {
  copyright: string;
  copyrightImageUrl: string | null;
  projectTitle: string | null;
}

export class Footer extends React.PureComponent<IProps> {
  render() {
    const { fullWidth, project } = this.props;
    const currentYear = new Date().getFullYear();
    const defaultFooter = `<p>Copyright &copy; ${currentYear} <a href="https://concord.org/" title="The Concord Consortium" rel="noreferrer" target="_blank">The Concord Consortium</a>. All rights reserved. This material is licensed under a <a href="https://creativecommons.org/licenses/by/4.0/" rel="noreferrer" target="_blank">Creative Commons Attribution 4.0 License</a>. The software is licensed under <a href="http://opensource.org/licenses/BSD-2-Clause" rel="noreferrer" target="_blank">Simplified BSD</a>, <a href="http://opensource.org/licenses/MIT" rel="noreferrer" target="_blank">MIT</a> or <a href="http://opensource.org/licenses/Apache-2.0" rel="noreferrer" target="_blank">Apache 2.0</a> licenses. Please provide attribution to the Concord Consortium and the URL <a href="https://concord.org/" title="The Concord Consortium" rel="noreferrer" target="_blank">https://concord.org</a>.</p>`;
    const projectHasFooterContent = project?.footer || project?.copyright || project?.collaborators;
    const mainFooterContent = projectHasFooterContent ? this.buildMainFooterContent(project) : renderHTML(defaultFooter);
    const contactEmail = project?.contact_email;
    const contactContent = contactEmail ? this.buildContactContent(contactEmail) : null;

    return (
      <div className="footer" data-cy="footer">
        <div className={`inner ${fullWidth ? "full" : ""}`}>
          <div className="footer-text">
            {mainFooterContent}
            {contactContent}
          </div>
        </div>
      </div>
    );
  }

  private buildMainFooterContent = (project: Project) => {
    const deprecatedFooter = project.footer;
    const copyright = project.copyright;
    const copyrightImageUrl = project.copyright_image_url;
    const collaborators = project.collaborators;
    const collaboratorsImageUrl = project.collaborators_image_url;
    const fundersImageUrl = project.funders_image_url;
    const projectTitle = project.title;
    const copyrightContent = copyright ? this.buildCopyrightContent({copyright, copyrightImageUrl, projectTitle}) : null;
    const collaboratorsContent = collaborators ? this.buildCollaboratorsContent({collaborators, fundersImageUrl, collaboratorsImageUrl, projectTitle}) : null;
    const useDeprecatedFooter = deprecatedFooter && !copyrightContent && !collaboratorsContent;

    return (
      <>
        {useDeprecatedFooter && renderHTML(deprecatedFooter)}
        {copyrightContent}
        {collaboratorsContent}
      </>
    );
  }

  private buildCollaboratorsContent = (props: ICollaboratorsContentProps) => {
    const { collaborators, fundersImageUrl, collaboratorsImageUrl, projectTitle } = props;
    return (
      <>
        <div className="footer-text-collaborators">
          {fundersImageUrl && <img className="funder" src={fundersImageUrl} alt={`${projectTitle || ""} Funder Logo(s)`} />}
          {renderHTML(collaborators)}
        </div>
        {collaboratorsImageUrl && <div className="footer-text-collaborators-image"><img src={collaboratorsImageUrl} alt={`${projectTitle || ""} Collaborator Logo(s)`} /></div>}
      </>
    );
  };

  private buildCopyrightContent = (props: ICopyrightContentProps) => {
    const { copyright, copyrightImageUrl, projectTitle } = props;
    return (
      <div className="footer-text-copyright">
        {copyrightImageUrl && <img className="copyright" src={copyrightImageUrl} alt={`${projectTitle} Copyright/License`} />}
        {renderHTML(copyright)}
      </div>
    );
  };

  private buildContactContent = (contactEmail: string) => {
    return (
      <div className="footer-text-contact">
        For more information, please email <a href="mailto:{contactEmail}" title={`Contact Us`}>{contactEmail}</a>.
      </div>
    );
  };
}
