import React from "react";
import IconCheck from "../../assets/svg-icons/icon-check.svg";

import "./completion-page-content.scss";

interface IProps {
  activityName: string;
  isComplete: boolean;
  onPageChange: (page: number) => void;
  showStudentReport: boolean;
  thumbnailURL: string;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activityName, isComplete, onPageChange, showStudentReport, thumbnailURL } = props;
  const handleExit = () => {
    onPageChange(0);
  };
  const quotedActivityName = "\"" + activityName + "\"";
  const completionText = `${quotedActivityName} activity complete!`;
  const progressText = isComplete
      ? `Congratulations! You have reached the end of ${quotedActivityName} and your work has been saved`
      : `It looks like you haven't quite finished ${quotedActivityName} yet. The answers you've given have been saved.`;
  const nextStepText = isComplete
      ? `You have completed ${quotedActivityName} and you may exit now.`
      : `You haven't completed ${quotedActivityName} yet. You can go back to complete it, or you can exit.`;
  return (
    <div className="completion-page-content" data-cy="completion-page-content">
      { isComplete && <div className="completion-text">{completionText}</div> }
      <div className="progress-container">
        <div>
          { isComplete &&  <IconCheck width={32} height={32} className="check" /> }
          {progressText}
        </div>
        { showStudentReport && <button className="button" >Show All Answers</button> }
      </div>
      <div className="exit-container">
        <div className="box">
          { thumbnailURL && <img src={thumbnailURL} /> }
          { isComplete && <div className="ribbon"><span>Completed</span></div> }
        </div>
        <div className="next-step">
          <div>{nextStepText}</div>
          <button className="button" onClick={handleExit}>Exit</button>
        </div>
      </div>
    </div>
  );
};

