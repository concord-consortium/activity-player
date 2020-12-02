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
  showStudentReport: boolean;
  thumbnailURL: string | null;
  onOpenReport?: () => void;
  sequence?: Sequence;
  activityIndex?: number;
  onActivityChange: (activityNum: number) => void;
  onShowSequence: () => void;
  allActivititiesComplete?: boolean;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activityName, isActivityComplete, onPageChange, showStudentReport, thumbnailURL,
          sequence, activityIndex, onActivityChange, onShowSequence } = props;

  const handleExit = () => {
    if (sequence) { onShowSequence();}
    else { onPageChange(0); }
  };
  const handleNextActivity = () => {
    onActivityChange(activityNum+1);
    onPageChange(0); //TODO: This should go to the student's saved state page for the next activity
  };
  const handleShowAnswers = () => {
    showReport();
  };

  const completionText = `"${activityName}" activity complete!`;
  const activityNum = activityIndex? activityIndex : 0;
  const completedActivityProgressText =
    `Congratulations! You have reached the end of "${activityName}" and your work has been saved.`;
  const incompleteActivityProgressText =
    `It looks like you haven't quite finished "${activityName}" yet. The answers you've given have been saved.`;
  const allActivititiesComplete = true; //TODO this should be based on student progress
  const isLastActivityInSequence = activityIndex? sequence?.activities.length === activityIndex+1: false;
  const nextActivityTitle = !isLastActivityInSequence && sequence?.activities[activityNum+1].name;
  const nextActivityDescription = !isLastActivityInSequence && renderHTML(sequence?.activities[activityNum+1].description || "");
  const nextStepMainContentTitle = sequence? sequence.display_title : activityName;
  const completedMainContentNextStepText = `You have completed "${nextStepMainContentTitle}" and you may exit now.`;
  const incompletedMainContentNextStepText =
    `You haven't completed "${nextStepMainContentTitle}" yet. You can go back to complete it, or you can exit.`;
  let progressText = "";
  let nextStepText = "";

  if (sequence) {
    if(isLastActivityInSequence) {
      progressText = isActivityComplete
        ? completedActivityProgressText + `You have completed all your work for this module!` : incompleteActivityProgressText;
      nextStepText = allActivititiesComplete? completedMainContentNextStepText : incompletedMainContentNextStepText;
    } else { //if !isLastActivity
      progressText = isActivityComplete? completedActivityProgressText : incompleteActivityProgressText;
      nextStepText = "";
    }
  } else { //if (!sequence) Assumes is single activity
    progressText = isActivityComplete? completedActivityProgressText : incompleteActivityProgressText;
    nextStepText = isActivityComplete? completedMainContentNextStepText : incompletedMainContentNextStepText;
  }
  return (
    <div className="completion-page-content" data-cy="completion-page-content">
      { isActivityComplete && <div className="completion-text" data-cy="completion-text">{completionText}</div> }
      <div className="progress-container" data-cy="progress-container">
        <div className="progress-text">
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
          { (sequence && !isLastActivityInSequence) && <div className="next">Next Up ...</div>}
          {sequence && <div className="completion-text">{nextActivityTitle}</div>}
          {sequence && <div>{nextActivityDescription}</div>}
          { (!isLastActivityInSequence && sequence) &&
            <span>
              <button className="button" onClick={handleNextActivity}>Start Next Activity</button>
              <span> or </span>
            </span>
          }
          <button className="button" onClick={handleExit}>Exit</button>
        </div>
      </div>
    </div>
  );
};
