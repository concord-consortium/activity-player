import React from "react";
import IconCheck from "../../assets/svg-icons/icon-check.svg";

import "./completion-page-content.scss";

interface IProps {
  activityName: string;
  isActivityComplete: boolean;
  onPageChange: (page: number) => void;
  onShowAllAnswers?: () => void;
  showStudentReport: boolean;
  thumbnailURL: string;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activityName, isActivityComplete, onPageChange, onShowAllAnswers, showStudentReport, thumbnailURL } = props;
  const handleExit = () => {
    onPageChange(0);
  };
  const handleShowAnswers = () => {
    onShowAllAnswers && onShowAllAnswers(); // TODO: show report
  };
  const quotedActivityName = "\"" + activityName + "\"";
  const completionText = `${quotedActivityName} activity complete!`;
  const progressText = isActivityComplete
      ? `Congratulations! You have reached the end of ${quotedActivityName} and your work has been saved`
      : `It looks like you haven't quite finished ${quotedActivityName} yet. The answers you've given have been saved.`;
  const nextStepText = isActivityComplete
      ? `You have completed ${quotedActivityName} and you may exit now.`
      : `You haven't completed ${quotedActivityName} yet. You can go back to complete it, or you can exit.`;
  return (
    <div className="completion-page-content" data-cy="completion-page-content">
      { isActivityComplete && <div className="completion-text" data-cy="completion-text">{completionText}</div> }
      <div className="progress-container" data-cy="progress-container">
        <div>
          { isActivityComplete &&  <IconCheck width={32} height={32} className="check" /> }
          {progressText}
        </div>
        { showStudentReport && <button className="button" onClick={handleShowAnswers}>Show All Answers</button> }
      </div>
      <div className="exit-container" data-cy="exit-container">
        <div className="box">
          { thumbnailURL && <img src={thumbnailURL} /> }
          { isActivityComplete && <div className="ribbon"><span>Completed</span></div> }
        </div>
        <div className="next-step" data-cy="next-step">
          <div>{nextStepText}</div>
          <button className="button" onClick={handleExit}>Exit</button>
        </div>
      </div>
    </div>
  );
};

