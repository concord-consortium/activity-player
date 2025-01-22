import { Page, ActivityFeedback, QuestionFeedback } from "../types";
import { pageHasFeedback, subscribeToActivityLevelFeedback, subscribeToQuestionLevelFeedback } from "./feedback-utils";

jest.mock("../firebase-db", () => ({
  watchActivityLevelFeedback: jest.fn((callback: (feedback: ActivityFeedback | null) => void) => {
    callback(null);

    // simulate the unsubscribe function
    return jest.fn();
  }),
  watchQuestionLevelFeedback: jest.fn((callback: (fbs: QuestionFeedback[]) => number[]) => {
    const feedback = [
      {questionId: "refId1", content: "Good job!", timestamp: "2021-01-01T00:00:00Z"},
      {questionId: "refId3", content: "Awesome job!", timestamp: "2021-01-01T00:00:00Z"}
    ];
    callback(feedback);

    // simulate the unsubscribe function
    return jest.fn();
  })
}));

describe("Feedback utility functions", () => {
  it("subscribes to activity-level feedback", () => {
    const activityId = 1;
    const isSequence = false;
    const setStateCallback = jest.fn();
    const unsubscribe = subscribeToActivityLevelFeedback(activityId, isSequence, setStateCallback);
    expect(unsubscribe).toBeDefined();
    expect(setStateCallback).toHaveBeenCalledWith(null);
  });

  it("subscribes to question-level feedback", () => {
    const activityId = 1;
    const isSequence = false;
    const setStateCallback = jest.fn();
    const questionToActivityMap = {
      "refId1": { activityId: 1, pageId: 1 },
      "refId2": { activityId: 1, pageId: 2 },
      "refId3": { activityId: 1, pageId: 3 },
    };
    const unsubscribe = subscribeToQuestionLevelFeedback(activityId, isSequence, setStateCallback, questionToActivityMap);
    expect(unsubscribe).toBeDefined();
    expect(setStateCallback).toHaveBeenCalledWith([1, 3]);
  });

  it("checks if a page has feedback", () => {
    const page1 = { id: 1, is_completion: false } as Partial<Page> as Page;
    const page2 = { id: 2, is_completion: false } as Partial<Page> as Page;
    const page3 = { id: 3, is_completion: true } as Partial<Page> as Page;
    const pagesWithFeedback = [1];
    const activityLevelFeedbackExists = false;
    expect(pageHasFeedback(page1, pagesWithFeedback, activityLevelFeedbackExists)).toBe(true);
    expect(pageHasFeedback(page2, pagesWithFeedback, activityLevelFeedbackExists)).toBe(false);
    expect(pageHasFeedback(page3, pagesWithFeedback, activityLevelFeedbackExists)).toBe(true);
  });
});
