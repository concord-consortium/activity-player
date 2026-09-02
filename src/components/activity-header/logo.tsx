import React from "react";
import ccLogoUrl from "../../assets/svg-icons/cclogo.svg?url";
import { isHttpUrl } from "../../utilities/url-utils";

import "./logo.scss";

interface IProps {
  logo?: string | null;
  url: string | undefined;
  // The project title, used as the alt text when a project-supplied logo is shown.
  title?: string | null;
}

export class Logo extends React.PureComponent<IProps> {
  render() {
    const { url } = this.props;

    // Render the logo as a native anchor when it has a destination so
    // assistive technology announces it as a link and it is keyboard-operable
    // with standard interaction. Fall back to a non-interactive container when
    // there is no (safe) url to link to. The url originates from author-supplied
    // project data, so only http(s) destinations are linked — this avoids turning
    // a malicious scheme (e.g. javascript:) into an executable link.
    if (isHttpUrl(url)) {
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

  // Render the logo as an <img> with alt text that matches the visible logo.
  // A project-supplied logo uses the project title; otherwise the default
  // Concord Consortium logo is shown with its own descriptive alt text.
  private renderLogoImage = () => {
    const { logo, title } = this.props;
    // The alt text is the link's accessible name, so the project-logo fallback
    // describes the destination ("Project website") rather than the image when no
    // title is available; whitespace-only titles are treated as empty.
    return logo
      ? <img data-cy="logo-img" className="logo-img" src={logo} alt={title?.trim() || "Project website"} />
      : <img data-cy="logo-img" className="logo-img cc-logo" src={ccLogoUrl} alt="Concord Consortium" />;
  }
}
