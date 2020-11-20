import React from "react";
import IconCheck from "../../assets/svg-icons/icon-check.svg";
import { showReport } from "../../utilities/report-utils";
import { Sequence } from "../../types";
import { renderHTML } from "../../utilities/render-html";


import "./completion-page-content.scss";

interface IProps {
  activityName: string;
  isActivityComplete: boolean;
  onPageChange: (page: number) => void;
  // onShowAllAnswers?: () => void;
  showStudentReport: boolean;
  thumbnailURL: string | null;
  onOpenReport?: () => void;
  sequence?: Sequence;
  isLastActivityInSequence?: boolean;
  activityIndex?: number;
  onActivityChange: (activityNum: number) => void;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activityName, isActivityComplete, onPageChange, showStudentReport, thumbnailURL } = props;
  const handleExit = () => {
    onPageChange(0);
  };
  const handleShowAnswers = () => {
    showReport();
  const { activityName, isActivityComplete, onPageChange, showStudentReport, thumbnailURL, onOpenReport,
          sequence, isLastActivityInSequence, activityIndex, onActivityChange } = props;
  const handleExit = () => {
    onPageChange(0);
  };
  const handleNextActivity = () => {
    onActivityChange(activityNum+1);
    onPageChange(0); //TODO: This should go to the student's saved state page for the next activity
  };

  const quotedActivityName = "\"" + activityName + "\"";
  const completionText = `${quotedActivityName} activity complete!`;
  const activityNum = activityIndex? activityIndex : 0;
  const nextActivityTitle = sequence?.activities[activityNum].name;
  const nextActivityDescriptionHTML = sequence?.activities[activityNum].description || "";
  const nextActivityDescription = renderHTML(nextActivityDescriptionHTML);
  let progressText = "";
  let nextStepText = "";

  if (sequence) {
    if(isLastActivityInSequence) {
      progressText = isActivityComplete
      ? `Congratulations! You have reached the end of ${quotedActivityName} and your work has been saved. You have completed all your work for this module!`
      : `It looks like you haven't quite finished ${quotedActivityName} yet. The answers you've given have been saved.`;
      nextStepText = isLastActivityInSequence
      ? `You have completed ${sequence?.display_title} and you may exit now.`
      : `You haven't completed ${sequence?.display_title} yet. You can go back to complete it, or you can exit.`;
    } else { //if !isLastActivity
      progressText = isActivityComplete
      ? `Congratulations! You have reached the end of ${quotedActivityName} and your work has been saved`
      : `It looks like you haven't quite finished ${quotedActivityName} yet. The answers you've given have been saved.`;
      nextStepText =``;
    }
  } else { //if (!sequence) Assumes is single activity
    progressText = isActivityComplete
    ? `Congratulations! You have reached the end of ${quotedActivityName} and your work has been saved`
    : `It looks like you haven't quite finished ${quotedActivityName} yet. The answers you've given have been saved.`;
    nextStepText = isActivityComplete
    ? `You have completed ${quotedActivityName} and you may exit now.`
    : `You haven't completed ${quotedActivityName} yet. You can go back to complete it, or you can exit.`;
  }
  return (
    <div className="completion-page-content" data-cy="completion-page-content">
      { isActivityComplete && <div className="completion-text" data-cy="completion-text">{completionText}</div> }
      <div className="progress-container" data-cy="progress-container">
        <div>
          { isActivityComplete &&  <IconCheck width={32} height={32} className="check" /> }
          {progressText}
        </div>
        { showStudentReport && <button className="button" onClick={onOpenReport}>Show All Answers</button> }
      </div>
      <div className="exit-container" data-cy="exit-container">
        <div className="box">
          { thumbnailURL && <img src={thumbnailURL} /> }
          { isActivityComplete && <div className="ribbon"><span>Completed</span></div> }
        </div>
        <div className="next-step" data-cy="next-step">
          <div>{nextStepText}</div>
          { !isLastActivityInSequence && <div className="next">Next Up ...</div>}
          {sequence && <div className="completion-text">{nextActivityTitle}</div>}
          {sequence && <div>{nextActivityDescription}</div>}
          { (!isLastActivityInSequence && sequence) && <button className="button" onClick={handleNextActivity}>Start Next Activity</button>}
          <button className="button" onClick={handleExit}>Exit</button>
        </div>
      </div>
    </div>
  );
};
