import React, { useEffect, useState } from "react";
import IconCheck from "../../assets/svg-icons/icon-check.svg";
import { showReport } from "../../utilities/report-utils";
import { Sequence, Activity, EmbeddableWrapper } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { watchAllAnswers } from "../../firebase-db";
import { isQuestion } from "../../utilities/activity-utils";
import { refIdToAnswersQuestionId } from "../../utilities/embeddable-utils";
import ccPlaceholderLogo from "../../assets/cc-placeholder.png";

import "./completion-page-content.scss";

interface IProps {
  activity: Activity;
  activityName: string;
  onPageChange: (page: number) => void;
  showStudentReport: boolean;
  thumbnailURL: string | null;
  onOpenReport?: () => void;
  sequence?: Sequence;
  activityIndex?: number;
  onActivityChange?: (activityNum: number) => void;
  onShowSequence?: () => void;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activity, activityName, onPageChange, showStudentReport, thumbnailURL,
    sequence, activityIndex, onActivityChange, onShowSequence } = props;
  
  const [answers, setAnswers] = useState<any>();
  let activityCompletionArray: boolean[]=[];

  const handleExit = () => {
    if (sequence) { onShowSequence?.(); }
    else { onPageChange(0); }
  };
  const handleNextActivity = () => {
    onActivityChange?.(activityNum + 1);
    onPageChange(0); //TODO: This should go to the student's saved state page for the next activity
  };
  const handleShowAnswers = () => {
    showReport();
  };

  const sequenceProgress = () => {
    let activityStatus;
    sequence?.activities.map((sequenceActivity)=>{
      activityStatus = activityProgress(sequenceActivity);    
      const sequenceActivityComplete = activityStatus.numAnswers === activityStatus.numQuestions;
      const activityCompletionArrayCopy = [...activityCompletionArray];
      console.log("activityStatus: ", activityStatus);
      activityCompletionArrayCopy?.push(sequenceActivityComplete);
      console.log("after activityCompletionArrayCopy.push: ", activityCompletionArrayCopy);
      // setActivityCompletionArray(activityCompletionArrayCopy);
      activityCompletionArray = [...activityCompletionArrayCopy];
      console.log("after activityCompletion.push: ", activityCompletionArray);

    });             
    if (activityCompletionArray?.length === sequence?.activities.length && !activityCompletionArray?.includes(false)) {
      return true;
    } else {
      return false;
    }
  };

  const activityProgress = (kActivity: Activity) => {
    let answerNum = 0, questionNum = 0, questionId: string;
    let i = 0;
    for (i = 0; i < kActivity.pages.length; i++) {
      kActivity.pages[i].embeddables.map((embeddableWrapper: EmbeddableWrapper) => {
        if (isQuestion(embeddableWrapper)) {
          questionNum++;
          questionId = refIdToAnswersQuestionId(embeddableWrapper.embeddable.ref_id);
          answers?.map((answer: any) => {
            //This does not take into account if user erase their open text response or answerTest is empty string 
            // after response has been saved
            if (!answer.meta.question_id) {
              console.log("questionId: ",questionId);
            }
            else if (answer.meta.question_id === questionId) { 
              answerNum++;
            }
          });
        }
      });
    }
    return ({ numAnswers: answerNum, numQuestions: questionNum });
  };

  useEffect(() => {
    watchAllAnswers(answerMetas => {
      setAnswers(answerMetas);
    });
  },[]);

  if(!answers) {
    return (
      <div className="completion-page-content" data-cy="completion-page-content">
        <div className="progress-container" data-cy="progress-container">
          <div className="progress-text">
            Fetching your data ...
          </div>
        </div>
      </div>  
    );
  }

  const progress = activityProgress(activity);
  const isActivityComplete = progress.numAnswers === progress.numQuestions;
  const activityTitle = (activityName !== "") || (activityName == null) ? activityName : "the activity";
  const completionText = activityName ? `${activityName} activity complete!` : "Activity complete!";
  const activityNum = activityIndex ? activityIndex : 0;
  const completedActivityProgressText =
    `Congratulations! You have reached the end of ${activityTitle} and your work has been saved.`;
  const incompleteActivityProgressText =
    `It looks like you haven't quite finished ${activityTitle} yet. The answers you've given have been saved.`;
  const isLastActivityInSequence = activityIndex ? sequence?.activities.length === activityIndex + 1 : false;
  const nextActivityTitle = !isLastActivityInSequence && sequence?.activities[activityNum + 1].name;
  const nextActivityDescription = !isLastActivityInSequence && renderHTML(sequence?.activities[activityNum + 1].description || "");
  const nextStepMainContentTitle = sequence ? (sequence.display_title !== "" ? sequence.display_title : "the sequence") : activityTitle;
  const completedMainContentNextStepText = `You have completed ${nextStepMainContentTitle} and you may exit now.`;
  const incompletedMainContentNextStepText =
    `You haven't completed ${nextStepMainContentTitle} yet. You can go back to complete it, or you can exit.`;
  let progressText = "";
  let nextStepText = "";

  if (sequence) {
    const sequenceComplete = sequenceProgress();
    
    if (isLastActivityInSequence) {
      progressText = isActivityComplete
        ? completedActivityProgressText + `You have completed all your work for this module!` : incompleteActivityProgressText;
      nextStepText = sequenceComplete ? completedMainContentNextStepText : incompletedMainContentNextStepText;
    } else { //if !isLastActivity
      progressText = isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;

      nextStepText = "";
    }
  } else { //if (!sequence) Assumes is single activity
    progressText = isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
    nextStepText = isActivityComplete ? completedMainContentNextStepText : incompletedMainContentNextStepText;

  }
  return (
    <div className="completion-page-content" data-cy="completion-page-content">
      { isActivityComplete && <div className="completion-text" data-cy="completion-text">{completionText}</div>}
      <div className="progress-container" data-cy="progress-container">
        <div className="progress-text">
          {isActivityComplete && <IconCheck width={32} height={32} className="check" />}
          {progressText}
        </div>
        {showStudentReport && <button className="button" onClick={handleShowAnswers}>Show All Answers</button>}
      </div>
      <div className="exit-container" data-cy="exit-container">
        <div className="box">
          <img src={thumbnailURL ? thumbnailURL : ccPlaceholderLogo} />
          {isActivityComplete && <div className="ribbon"><span>Completed</span></div>}
        </div>
        <div className="next-step" data-cy="next-step">
          <div data-cy="next-step-text">{nextStepText}</div>
          <div className="progress-text">{`${progress.numAnswers} out of ${progress.numQuestions} questions are answered.`}</div>
          {(sequence && !isLastActivityInSequence) && <div className="next">Next Up ...</div>}
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
