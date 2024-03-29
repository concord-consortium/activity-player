import React, { useEffect, useState } from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";

import IconCheck from "../../assets/svg-icons/icon-check-circle.svg";
import IconCompletion from "../../assets/svg-icons/icon-completion.svg";
import IconUnfinishedCheck from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import { isValidReportLink, showReport } from "../../utilities/report-utils";
import { Sequence, Activity, EmbeddableType, Page } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { watchAllAnswers, WrappedDBAnswer } from "../../firebase-db";
import { isQuestion } from "../../utilities/activity-utils";
import { answerHasResponse, refIdToAnswersQuestionId } from "../../utilities/embeddable-utils";
import { SummaryTable, IQuestionStatus } from "./summary-table";
import ccPlaceholderLogo from "../../assets/cc-placeholder.png";
import { ReadAloudToggle } from "../read-aloud-toggle";

import "./completion-page-content.scss";

interface IProps {
  activity: Activity;
  activityName: string;
  onPageChange: (page: number) => void;
  showStudentReport: boolean;
  onOpenReport?: () => void;
  sequence?: Sequence;
  activityIndex?: number;
  onActivityChange?: (activityNum: number) => void;
  onShowSequence?: () => void;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activity, activityName, onPageChange, showStudentReport,
    sequence, activityIndex, onActivityChange, onShowSequence } = props;

  const [answers, setAnswers] = useState<WrappedDBAnswer[]>();

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
    const visiblePages = currentActivity.pages.filter(page => !page.is_hidden);
    const questionsStatus = Array<IQuestionStatus>();
    visiblePages.forEach((page: Page, index) => {
      const pageNum = index + 1;
      const visibleSections = page.sections.filter(section => !section.is_hidden);
      visibleSections.forEach((section) => {
        const visibleEmbeddables = section.embeddables.filter(embeddable => !embeddable.is_hidden);
        visibleEmbeddables.forEach((embeddable: EmbeddableType) => {
          if (isQuestion(embeddable)) {
            numQuestions++;
            const questionId = refIdToAnswersQuestionId(embeddable.ref_id);
            const authoredState = embeddable.authored_state
                                    ? JSON.parse(embeddable.authored_state)
                                    : {};
            let questionAnswered = false;
            const answer = answers?.find(a => a.meta.question_id === questionId);
            if (answer && answerHasResponse(answer, authoredState)) {
              numAnswers++; //Does't take into account if user erases response after saving
              questionAnswered = true;
            }
            const questionStatus = { number: numQuestions, page: pageNum, prompt: authoredState.prompt, answered: questionAnswered };
            questionsStatus.push(questionStatus);
          }
        });
      });
    });
    return ({ numAnswers, numQuestions, questionsStatus });
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

  return (
    !answers
      ? <div className="completion-page-content" data-cy="completion-page-content">
          <div className="progress-container" data-cy="progress-container">
            <div className="progress-text">
              <DynamicText>Fetching your data ...</DynamicText>
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
              <DynamicText>{progressText}</DynamicText>
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
                    <div className="next"><DynamicText>Next Up ...</DynamicText></div>
                    <DynamicText>{nextActivityTitle}</DynamicText>
                  </div>
                  <DynamicText>{nextActivityDescription}</DynamicText>
                </div>
                <div className="next-step-buttons">
                  <button className="button" onClick={handleNextActivity}>Start Next Activity</button>
                  <span>or</span>
                  <button className="textButton" onClick={handleExit}>Exit</button>
                </div>
              </div>
            </div>
          }
          <div className="exit-container" data-cy="exit-container">
            <div className="summary-of-work">
              <h1><DynamicText>Summary of Work: <span className="activity-title">{activityTitle}</span></DynamicText></h1>
              <ReadAloudToggle/>
            </div>
            <SummaryTable questionsStatus={progress.questionsStatus} />
            {showStudentReport && <button className={`button show-my-work ${isValidReportLink() ? "" : "disabled"}`}
                                          onClick={handleShowAnswers}><IconCompletion width={24} height={24} />
                                    Show My Work
                                  </button>}
            {(!sequence || isLastActivityInSequence) &&
              <div className="exit-button">
                <span>or</span>
                <button className="textButton" onClick={handleExit}>Exit</button>
              </div>
            }
          </div>
        </div>
  );
};
