import React, { useEffect, useMemo, useState } from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";

import IconCheck from "../../assets/svg-icons/icon-check-circle.svg";
import IconCompletion from "../../assets/svg-icons/icon-completion.svg";
import IconUnfinishedCheck from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import { isValidReportLink, showReport } from "../../utilities/report-utils";
import { Sequence, Activity, ActivityFeedback, QuestionFeedback } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { watchAllAnswers, watchQuestionLevelFeedback, WrappedDBAnswer } from "../../firebase-db";
import { getEmbeddable, getPageNumberFromEmbeddable, isQuestion, isSequenceFinished } from "../../utilities/activity-utils";
import { answerHasResponse, answersQuestionIdToRefId, refIdToAnswersQuestionId } from "../../utilities/embeddable-utils";
import { SummaryTable, IQuestionStatus } from "./summary-table";
import { SequenceIntroFeedbackBanner } from "../teacher-feedback/sequence-intro-feedback-banner";
import { ActivityLevelFeedbackBanner } from "../teacher-feedback/activity-level-feedback-banner";
import { ReadAloudToggle } from "../read-aloud-toggle";
import { NextSteps } from "./next-steps";
import { subscribeToActivityLevelFeedback } from "../../utilities/feedback-utils";
import { QuestionToActivityMap } from "../app";

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
  questionIdsToActivityIdsMap?: QuestionToActivityMap;
}

export const CompletionPageContent: React.FC<IProps> = (props) => {
  const { activity, activityName, onPageChange, showStudentReport,
    sequence, activityIndex, onActivityChange, onShowSequence, questionIdsToActivityIdsMap } = props;
  const [answers, setAnswers] = useState<WrappedDBAnswer[]>();
  const [activityFeedback, setActivityFeedback] = useState<ActivityFeedback | null>(null);
  const [questionFeedback, setQuestionFeedback] = useState<QuestionFeedback[]>([]);

  const questionsInActivity = useMemo((): string[] => {
    if (!activity || !questionIdsToActivityIdsMap || Object.entries(questionIdsToActivityIdsMap).length === 0) return [];
    const qsInActivity = Object.keys(questionIdsToActivityIdsMap).filter(q => questionIdsToActivityIdsMap?.[q].activityId === activity.id);
    const qIDs = qsInActivity.map(refIdToAnswersQuestionId);
    const onlyQuestions = qIDs.filter(id => {
      const embeddableId = answersQuestionIdToRefId(id);
      const embeddable = getEmbeddable(activity, embeddableId);
      return embeddable && isQuestion(embeddable);
    });
    return onlyQuestions;
  }, [activity, questionIdsToActivityIdsMap]);

  useEffect(() => {
    const unsubscribeAnswers = watchAllAnswers(answerMetas => {
      const answersInActivity = answerMetas.filter(a => questionsInActivity.includes(a.meta.question_id));
      setAnswers(answersInActivity);
    });

    const unsubscribeQFeedback = watchQuestionLevelFeedback((fbs: QuestionFeedback[]) => {
      const questionFeedbackInThisActivity = fbs.filter(f => questionsInActivity.includes(f.questionId));
      setQuestionFeedback(questionFeedbackInThisActivity);
    });

    return () => {
      unsubscribeAnswers?.();
      unsubscribeQFeedback?.();
    };
  }, [questionsInActivity]);

  useEffect(() => {
    if (activity.id) {
      const unsubscribe = subscribeToActivityLevelFeedback(
        activity.id,
        !!sequence,
        (fb: ActivityFeedback | null) => setActivityFeedback(fb)
      );

      return () => unsubscribe();
    }
  }, [activity.id, sequence]);

  const questionSummaries = useMemo((): IQuestionStatus[] => {
    const summaries: IQuestionStatus[] = [];
    questionsInActivity?.forEach((id, idx) => {
      const embeddableId = answersQuestionIdToRefId(id);
      const embeddable = getEmbeddable(activity, embeddableId);
      if (embeddable && isQuestion(embeddable)) {
        const feedback = questionFeedback.find(f => f.questionId === id);
        const answer = answers?.find(a => a.meta.question_id === id);
        const authoredState = embeddable?.authored_state ? JSON.parse(embeddable.authored_state) : {};
        const answered = answer ? answerHasResponse(answer, authoredState) : false;
        const page = getPageNumberFromEmbeddable(activity, embeddableId) || 0;

        summaries.push({
          number: idx + 1,
          page,
          prompt: authoredState.prompt,
          answered,
          feedback
        });
      }
    });
    return summaries;
  }, [activity, answers, questionFeedback, questionsInActivity]);


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

  const isActivityComplete = answers?.length === questionsInActivity.length;
  const activityTitle = activityName || "the activity";
  const activityNum = activityIndex || 0;
  const completedActivityProgressText = `Congratulations! You have reached the end of this activity.`;
  const incompleteActivityProgressText = `It looks like you haven't quite finished this activity yet.`;
  const isLastActivityInSequence = sequence ? sequence.activities.length === activityNum + 1 : false;

  const getProgressText = () => {
    if (!sequence) {
      return isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
    }

    const sequenceComplete = isSequenceFinished(sequence, answers);
    if (isLastActivityInSequence) {
      if (sequenceComplete && isActivityComplete) {
        return `${completedActivityProgressText} You have completed all your work for this module!`;
      }
      return isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
    }

    return isActivityComplete ? completedActivityProgressText : incompleteActivityProgressText;
  };

  const progressText = getProgressText();

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
          <div className="banners">
            <div className={`progress-container ${!isActivityComplete ? "incomplete" : ""}`} data-cy="progress-container">
              {isActivityComplete
                ? <IconCheck width={24} height={24} className="check" />
                : <IconUnfinishedCheck width={24} height={24} className="check incomplete" />
              }
              <div className="progress-text" data-cy="progress-text">
                <DynamicText>{progressText}</DynamicText>
              </div>
            </div>
            {activityFeedback &&
              <SequenceIntroFeedbackBanner />
            }
          </div>
          {sequence && !isLastActivityInSequence &&
           <NextSteps
              nextActivityThumbnailURL={sequence.activities[activityNum + 1].thumbnail_url}
              nextActivityTitle={sequence.activities[activityNum + 1].name}
              nextActivityDescription={renderHTML(sequence.activities[activityNum + 1].description || "")}
              handleNextActivity={handleNextActivity}
              handleExit={handleExit}
            />
          }
          <div className="exit-container" data-cy="exit-container">
            <div className="summary-of-work">
              <h1><DynamicText>Summary of Work: <span className="activity-title">{activityTitle}</span></DynamicText></h1>
              <ReadAloudToggle/>
            </div>
            {activityFeedback &&
              <ActivityLevelFeedbackBanner teacherFeedback={activityFeedback} />

            }
            <SummaryTable questionsStatus={questionSummaries} />
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
