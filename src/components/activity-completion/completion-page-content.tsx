import React, { useEffect, useState } from "react";
import IconCheck from "../../assets/svg-icons/icon-check-circle.svg";
import IconCompletion from "../../assets/svg-icons/icon-completion.svg";
import IconUnfinishedCheck from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import { showReport } from "../../utilities/report-utils";
import { Sequence, Activity, EmbeddableWrapper, Page } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { getStorage } from "../../storage/storage-facade";
import { orderedQuestionsOnPage } from "../../utilities/activity-utils";
import { refIdToAnswersQuestionId } from "../../utilities/embeddable-utils";
import { SummaryTable, IQuestionStatus } from "./summary-table";
import { ReportBackupOptions } from "./report-backup-options";
import ccPlaceholderLogo from "../../assets/cc-placeholder.png";

import "./completion-page-content.scss";

interface IProps {
  activity: Activity;
  activityName: string;
  onPageChange: (page: number) => void;
  showStudentReport: boolean;
  showReportBackupOptions: boolean;
  onOpenReport?: () => void;
  sequence?: Sequence;
  activityIndex?: number;
  onActivityChange?: (activityNum: number) => void;
  onShowSequence?: () => void;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activity, activityName, onPageChange, showStudentReport, 
    showReportBackupOptions, sequence, activityIndex, onActivityChange, 
    onShowSequence } = props;

  const [answers, setAnswers] = useState<any>();
  const [canProvideStudentReport, setCanProvideStudentReport] = useState<boolean>();

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
    const questionsStatus = Array<IQuestionStatus>();
    currentActivity.pages.forEach((page: Page, index) => {
      const pageNum = index + 1;
      orderedQuestionsOnPage(page).forEach((embeddableWrapper: EmbeddableWrapper) => {
        numQuestions++;
        const questionId = refIdToAnswersQuestionId(embeddableWrapper.embeddable.ref_id);
        const authored_state = embeddableWrapper.embeddable.authored_state
                                  ? JSON.parse(embeddableWrapper.embeddable.authored_state)
                                  : {};
        let questionAnswered = false;
        if (answers?.find((answer: any) => answer.meta.question_id === questionId)) {
          numAnswers++; //Does't take into account if user erases response after saving
          questionAnswered = true;
        }
        const questionStatus = { number: numQuestions, page: pageNum, prompt: authored_state.prompt, answered: questionAnswered };
        questionsStatus.push(questionStatus);
      });
    });
    return ({ numAnswers, numQuestions, questionsStatus });
  };

  useEffect(() => {
    const storage = getStorage();
    setCanProvideStudentReport(storage.canProvideStudentReport());
    storage.watchAllAnswers(answerMetas => {
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
  const nextActivityThumbnailURL = !isLastActivityInSequence && sequence?.activities[activityNum + 1].thumbnail_url;
  const nextActivityDescription = !isLastActivityInSequence &&
                                  renderHTML(sequence?.activities[activityNum + 1].description || "");
  let progressText = "";

  if (sequence) {
    const sequenceComplete = sequenceProgress(sequence);
    if (isLastActivityInSequence) {
      progressText = sequenceComplete && isActivityComplete 
                       ? completedActivityProgressText + ` You have completed all your work for this module!`
                       : isActivityComplete
                           ? completedActivityProgressText
                           : incompleteActivityProgressText;
    } else {
      progressText = isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
    }
  } else { //assumes is single activity
    progressText = isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
  }

  const exitContainerClass = showReportBackupOptions ? "exit-container with-backup-options" : "exit-container";
  const showStudentReportButton = showStudentReport && canProvideStudentReport;
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
              : <IconUnfinishedCheck width={24} height={24} className="check incomplete" />
            }
            <div className="progress-text" data-cy="progress-text">
              {progressText}
            </div>
          </div>
          {sequence && !isLastActivityInSequence &&
            <div className="next-step" data-cy="next-step">
              <div className="next-step-thumbnail">
                <img src={nextActivityThumbnailURL ? nextActivityThumbnailURL : ccPlaceholderLogo} alt="Next Activity" />
              </div>
              <div className="next-step-content">
                <div className="next-step-text">
                  <div className="next-step-title">
                    <div className="next">Next Up ...</div>
                    {nextActivityTitle}
                  </div>
                  {nextActivityDescription}
                </div>
                <div className="next-step-buttons">
                  <button className="button" onClick={handleNextActivity}>Start Next Activity</button>
                  <span>or</span>
                  <button className="textButton" onClick={handleExit}>Exit</button>
                </div>
              </div>
            </div>
          }
          <div className={exitContainerClass} data-cy="exit-container">
            <h1>Summary of Work: <span className="activity-title">{activityTitle}</span></h1>
            <SummaryTable questionsStatus={progress.questionsStatus} />
              { showStudentReportButton
                  ?
                    <button
                      className="button show-my-work"
                      onClick={handleShowAnswers}>
                        <IconCompletion width={24} height={24} />
                        Show My Work
                    </button>
                  :
                    <button
                      className="button show-my-work disabled"
                      disabled={true}>
                        <IconCompletion width={24} height={24} />
                        Show My Work
                    </button>
              }
            {(!sequence || isLastActivityInSequence) &&
              <div className="exit-button">
                { showStudentReportButton && <span>or</span> }
                <button className="textButton" onClick={handleExit}>Exit</button>
              </div>
            }
          </div>
          {showReportBackupOptions &&
            <ReportBackupOptions />
          }
        </div>
  );
};
