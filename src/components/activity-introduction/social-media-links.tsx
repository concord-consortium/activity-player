import React from "react";
import {
  FacebookShareButton,
  FacebookIcon,
  TwitterShareButton,
  TwitterIcon
} from "react-share";

import './social-media-links.scss';

interface IProps {
  shareURL: string;
}

export class SocialMediaLinks extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="social-media-links">
        <span className="share" data-cy="share-facebook">
          <FacebookShareButton className="share-button" url={this.props.shareURL}>
            <FacebookIcon round size={24} />
          </FacebookShareButton>
        </span>
        <span className="share" data-cy="share-twitter">
          <TwitterShareButton className="share-button" url={this.props.shareURL}>
            <TwitterIcon round size={24} />
          </TwitterShareButton>
        </span>
      </div>
    );
  }
}
