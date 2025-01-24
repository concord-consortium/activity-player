import { watchActivityLevelFeedback, watchQuestionLevelFeedback } from "../firebase-db";
import { Page, ActivityFeedback, QuestionFeedback, QuestionToActivityMap } from "../types";
import { answersQuestionIdToRefId } from "./embeddable-utils";

interface ISubscribeActivityLevelFeedback {
  activityId: number;
  callback: (feedback: ActivityFeedback | null) => void;
  isSequence: boolean;
}

interface ISubscribeQuestionLevelFeedback {
  activityId: number;
  callback: (pageIds: number[]) => void;
  isSequence: boolean;
  questionToActivityMap?: QuestionToActivityMap;
}

export const subscribeToActivityLevelFeedback = (args: ISubscribeActivityLevelFeedback) => {
  const { activityId, callback, isSequence } = args;
  const activityIdString = isSequence ? `activity_${activityId}` : `activity-activity_${activityId}`;

  return watchActivityLevelFeedback((feedback: ActivityFeedback[] | null) => {
    const fb = feedback?.find(f => f.activityId?.toString() === activityIdString) ?? null;
    callback(fb);
  });
};

export const subscribeToQuestionLevelFeedback = (args: ISubscribeQuestionLevelFeedback) => {
  const { activityId, callback, isSequence, questionToActivityMap } = args;

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

    callback(pageIds);
  });
};

export const pageHasFeedback = (page: Page, pagesWithFb: number[], activityLevelFbExists: boolean) => {
  return page.is_completion
    ? pagesWithFb.length > 0 || activityLevelFbExists
    : pagesWithFb.includes(page.id);
};
