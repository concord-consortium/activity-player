import React from "react";
import ccLogoUrl from "../../assets/svg-icons/cclogo.svg?url";

import "./logo.scss";

interface IProps {
  logo: any;
  url: string | undefined;
  // The project title, used as the alt text when a project-supplied logo is shown.
  title?: string | null;
}

export class Logo extends React.PureComponent<IProps> {
  render() {
    const { url } = this.props;

    // AP-86: render the logo as a native anchor when it has a destination so
    // assistive technology announces it as a link and it is keyboard-operable
    // with standard interaction. Fall back to a non-interactive container when
    // there is no url to link to.
    if (url) {
      return (
        <a
          className="project-logo"
          data-cy="project-logo"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {this.renderLogoImage()}
        </a>
      );
    }

    return (
      <div className="project-logo no-link" data-cy="project-logo">
        {this.renderLogoImage()}
      </div>
    );
  }

  // AP-87: render the logo as an <img> with alt text that matches the visible
  // logo. A project-supplied logo uses the project title; otherwise the default
  // Concord Consortium logo is shown with its own descriptive alt text.
  private renderLogoImage = () => {
    const { logo, title } = this.props;
    return logo
      ? <img data-cy="logo-img" className="logo-img" src={logo} alt={title || "Project logo"} />
      : <img data-cy="logo-img" className="logo-img cc-logo" src={ccLogoUrl} alt="Concord Consortium" />;
  }
}
