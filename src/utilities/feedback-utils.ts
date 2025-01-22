import { QuestionToActivityMap } from "../components/app";
import { watchActivityLevelFeedback, watchQuestionLevelFeedback } from "../firebase-db";
import { Page, ActivityFeedback, QuestionFeedback } from "../types";
import { answersQuestionIdToRefId } from "./embeddable-utils";

export const subscribeToActivityLevelFeedback = (
  activityId: number,
  isSequence: boolean,
  setStateCallback: (feedback: ActivityFeedback | null) => void
) => {
  return watchActivityLevelFeedback((feedback: ActivityFeedback[] | null) => {
    const activityIdString = isSequence ? `activity_${activityId}` : `activity-activity_${activityId}`;
    const fb = feedback?.filter(f => f.activityId?.toString() === activityIdString)[0] ?? null;
    setStateCallback(fb);
  });
};

export const subscribeToQuestionLevelFeedback = (
  activityId: number,
  isSequence: boolean,
  setStateCallback: (pagesWithFeedback: number[]) => void,
  questionToActivityMap?: QuestionToActivityMap
) => {
  return watchQuestionLevelFeedback((fb: QuestionFeedback[] | null) => {
    const questionIdsToRefId = fb?.map(f => answersQuestionIdToRefId(f.questionId));
    const pageIds: number[] = [];
    questionIdsToRefId?.forEach((refId: string) => {
      const pageId = questionToActivityMap?.[refId]?.pageId;
      const refActivityId = questionToActivityMap?.[refId]?.activityId;
      if ((!isSequence || (refActivityId === activityId && isSequence)) && pageId && !pageIds.includes(pageId)) {
        pageIds.push(pageId);
      }
    });

    setStateCallback(pageIds);
  });
};

export const pageHasFeedback = (
  page: Page,
  pagesWithFeedback: number[],
  activityLevelFeedbackExists: boolean
) => {
  if (page.is_completion) {
    return pagesWithFeedback.length > 0 || activityLevelFeedbackExists;
  }
  return pagesWithFeedback.includes(page.id);
};
