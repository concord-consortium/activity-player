import React, { useEffect, useState } from "react";
import IconCheck from "../../assets/svg-icons/icon-check-circle.svg";
import IconCompletion from "../../assets/svg-icons/icon-completion.svg";
import IconUnfinishedCheck from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import { showReport } from "../../utilities/report-utils";
import { Sequence, Activity, EmbeddableWrapper, Page } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { watchAllAnswers } from "../../firebase-db";
import { isQuestion } from "../../utilities/activity-utils";
import { refIdToAnswersQuestionId } from "../../utilities/embeddable-utils";
import { ReportBackupOptions } from "./report-backup-options";

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

  const handleExit = () => {
    if (sequence) {
      onShowSequence?.();
    } else {
      onPageChange(0);
    }
  };

  const handleNextActivity = () => {
    onActivityChange?.(activityNum + 1);
    onPageChange(0); //TODO: This should go to the student's saved state page for the next activity
  };

  const handleShowAnswers = () => {
    showReport();
  };

  const handleReportMyWork = () => {
    console.log("Report my work.");
  };

  const handleBackUpMyWork = () => {
    console.log("Back up my work.");
  };

  const sequenceProgress = (currentSequence: Sequence) => {
    const activityCompletionArray = currentSequence?.activities.map((sequenceActivity) => {
      const activityStatus = activityProgress(sequenceActivity);
      return activityStatus.numAnswers === activityStatus.numQuestions;
    });
    return !activityCompletionArray.includes(false);
  };

  const activityProgress = (currentActivity: Activity) => {
    let numAnswers = 0;
    let numQuestions = 0;
    currentActivity.pages.forEach((page: Page) => {
      page.embeddables.forEach((embeddableWrapper: EmbeddableWrapper) => {
        if (isQuestion(embeddableWrapper)) {
          numQuestions++;
          const questionId = refIdToAnswersQuestionId(embeddableWrapper.embeddable.ref_id);
          if (answers?.find((answer: any) => answer.meta.question_id === questionId)) {
            numAnswers++; //Does't take into account if user erases response after saving
          }
        }
      });
    });
    return ({ numAnswers, numQuestions });
  };

  useEffect(() => {
    watchAllAnswers(answerMetas => {
      setAnswers(answerMetas);
    });
  }, []);

  const progress = activityProgress(activity);
  const isActivityComplete = progress.numAnswers === progress.numQuestions;
  const activityTitle = (activityName !== "") || (activityName == null) ? activityName : "the activity";
  const activityNum = activityIndex ? activityIndex : 0;
  const completedActivityProgressText =
    `Congratulations! You have reached the end of this activity.`;
  const incompleteActivityProgressText =
    `It looks like you haven't quite finished this activity yet.`;
  const isLastActivityInSequence = activityIndex ? sequence?.activities.length === activityIndex + 1 : false;
  const nextActivityTitle = !isLastActivityInSequence && sequence?.activities[activityNum + 1].name;
  const nextActivityDescription = !isLastActivityInSequence &&
                                  renderHTML(sequence?.activities[activityNum + 1].description || "");
  const nextStepMainContentTitle = sequence ? (sequence.display_title !== "" ? sequence.display_title : "the sequence")
                                            : activityTitle;
  const completedMainContentNextStepText = `You have completed ${nextStepMainContentTitle} and you may exit now.`;
  const incompleteMainContentNextStepText =
          `You haven't completed ${nextStepMainContentTitle} yet. You can go back to complete it, or you can exit.`;
  let progressText = "";
  let nextStepText = "";

  if (sequence) {
    const sequenceComplete = sequenceProgress(sequence);
    if (isLastActivityInSequence) {
      progressText = isActivityComplete ? completedActivityProgressText + `You have completed all your work for this module!`
                                        : incompleteActivityProgressText;
      nextStepText = sequenceComplete ? completedMainContentNextStepText : incompleteMainContentNextStepText;
    } else {
      progressText = isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
      nextStepText = "";
    }
  } else { //assumes is single activity
    progressText = isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
    nextStepText = isActivityComplete ? completedMainContentNextStepText : incompleteMainContentNextStepText;
  }

  return (
    !answers
      ? <div className="completion-page-content" data-cy="completion-page-content">
          <div className="progress-container" data-cy="progress-container">
            <div className="progress-text">
              Fetching your data ...
            </div>
          </div>
        </div>
      : <div className="completion-page-content" data-cy="completion-page-content">
          <div className={`progress-container ${!isActivityComplete ? "incomplete" : ""}`} data-cy="progress-container">
            {isActivityComplete
              ? <IconCheck width={24} height={24} className="check" />
              : <IconUnfinishedCheck width={24} height={24} className="check" />
            }
            <div className="progress-text">
              {progressText}
            </div>
          </div>
          <div className="exit-container" data-cy="exit-container">
            <h1>Summary of Work: <span className="activity-title">{activityTitle}</span></h1>
            {showStudentReport && <button className="button show-my-work" onClick={handleShowAnswers}><IconCompletion width={24} height={24} />Show My Work</button>}
            <div className="next-step" data-cy="next-step">
              <div data-cy="next-step-text">{nextStepText}</div>
              <div className="num-complete-text">{`${progress.numAnswers} out of ${progress.numQuestions} questions are answered.`}</div>
              {(sequence && !isLastActivityInSequence) && <div className="next">Next Up ...</div>}
              {sequence && <div className="completion-text">{nextActivityTitle}</div>}
              {sequence && <div>{nextActivityDescription}</div>}
              {(!isLastActivityInSequence && sequence) &&
                <span>
                  <button className="button" onClick={handleNextActivity}>Start Next Activity</button>
                  <span> or </span>
                </span>
              }
              <button className="button" onClick={handleExit}>Exit</button>
            </div>
          </div>
          <ReportBackupOptions activity={activity} activityName={activityName} />
        </div>
  );
};
