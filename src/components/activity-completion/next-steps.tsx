import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import ccPlaceholderLogo from "../../assets/cc-placeholder.png";

import "./next-steps.scss";

interface IProps {
  nextActivityThumbnailURL?: string|null;
  nextActivityTitle: string;
  nextActivityDescription: string|JSX.Element|JSX.Element[];
  handleNextActivity: () => void;
  handleExit: () => void;
}

export const NextSteps: React.FC<IProps> = (props) => {
  const { nextActivityThumbnailURL, nextActivityTitle, nextActivityDescription, handleNextActivity, handleExit } = props;
  return (
    <div className="next-up-container" data-cy="next-step">
      <div className="next-activity-preview">
        <div className="preview-header">
          <div className="preview-thumbnail">
            <img src={nextActivityThumbnailURL ? nextActivityThumbnailURL : ccPlaceholderLogo} alt="Next Activity" />
          </div>
          <div className="preview-title-container">
            <div className="next">
              <DynamicText>Next Up ...</DynamicText>
            </div>
            <div className="activity-title">
              <DynamicText>{nextActivityTitle}</DynamicText>
            </div>
          </div>
        </div>
        <div className="preview-description">
          <DynamicText>{nextActivityDescription}</DynamicText>
        </div>
      </div>
      <div className="next-activity-options">
        <div className="next-activity-buttons">
          <button className="button" onClick={handleNextActivity}>Start Next Activity</button>
          <div>or</div>
          <button className="textButton" onClick={handleExit}>Exit</button>
        </div>
      </div>
    </div>
    );
};
