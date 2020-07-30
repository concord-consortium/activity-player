import { Activity } from "../types";
import { isQuestion, isEmbeddableSectionHidden, getVisibleEmbeddablesOnPage, VisibleEmbeddables,
  EmbeddableSections, getPageSectionQuestionCount, numQuestionsOnPreviousPages } from "./activity-utils";
import _activityHidden from "../data/sample-activity-hidden-content.json";
import _activity from "../data/sample-activity-multiple-layout-types.json";

const activityHidden = _activityHidden as Activity;
const activity = _activity as Activity;

describe("Activity utility functions", () => {
  it("determines if embeddable is a question", () => {
    const isE0Question = isQuestion(activity.pages[0].embeddables[0]);
    const isE1Question = isQuestion(activity.pages[0].embeddables[1]);
    const isE2Question = isQuestion(activity.pages[0].embeddables[2]);
    const isE3Question = isQuestion(activity.pages[0].embeddables[3]);
    const isE4Question = isQuestion(activity.pages[0].embeddables[4]);
    const isE5Question = isQuestion(activity.pages[0].embeddables[5]);
    const isE6Question = isQuestion(activity.pages[0].embeddables[6]);
    const isE7Question = isQuestion(activity.pages[0].embeddables[7]);
    expect(isE0Question).toBe(true);
    expect(isE1Question).toBe(true);
    expect(isE2Question).toBe(true);
    expect(isE3Question).toBe(false); // text block
    expect(isE4Question).toBe(true);
    expect(isE5Question).toBe(false); // text block
    expect(isE6Question).toBe(false); // text block
    expect(isE7Question).toBe(false); // enable_learner_state false

  });
  it("determines if embeddable section is hidden", () => {
    const hiddenActivityHeaderHiddenCount = isEmbeddableSectionHidden(activityHidden.pages[0], EmbeddableSections.Introduction);
    const hiddenActivityInfoAssessHiddenCount = isEmbeddableSectionHidden(activityHidden.pages[0], null);
    const hiddenActivityInteractiveHiddenCount = isEmbeddableSectionHidden(activityHidden.pages[0], EmbeddableSections.Interactive);
    expect(hiddenActivityHeaderHiddenCount).toBe(false);
    expect(hiddenActivityInfoAssessHiddenCount).toBe(false);
    expect(hiddenActivityInteractiveHiddenCount).toBe(true);
    // all sections shown in this activity
    const defaultActivityHeaderHiddenCount = isEmbeddableSectionHidden(activity.pages[0], EmbeddableSections.Introduction);
    const defaultActivityInfoAssessHiddenCount = isEmbeddableSectionHidden(activity.pages[0], null);
    const defaultActivityInteractiveHiddenCount = isEmbeddableSectionHidden(activity.pages[0], EmbeddableSections.Interactive);
    expect(defaultActivityHeaderHiddenCount).toBe(false);
    expect(defaultActivityInfoAssessHiddenCount).toBe(false);
    expect(defaultActivityInteractiveHiddenCount).toBe(false);
  });
  it("gets the number of visible embeddables on a page", () => {
    const visibleEmbeddablesDefaultActivity: VisibleEmbeddables = getVisibleEmbeddablesOnPage(activity.pages[0]);
    const visibleEmbeddablesDefaultActivityHidden: VisibleEmbeddables = getVisibleEmbeddablesOnPage(activityHidden.pages[0]);
    expect(visibleEmbeddablesDefaultActivity.headerBlock.length).toBe(4);
    expect(visibleEmbeddablesDefaultActivity.infoAssessment.length).toBe(3);
    expect(visibleEmbeddablesDefaultActivity.interactiveBox.length).toBe(1);
    expect(visibleEmbeddablesDefaultActivityHidden.headerBlock.length).toBe(1);
    expect(visibleEmbeddablesDefaultActivityHidden.infoAssessment.length).toBe(2);
    expect(visibleEmbeddablesDefaultActivityHidden.interactiveBox.length).toBe(0);
  });
  it("gets the number of questions in each page section", () => {
    const pageSectionQuestionCountDefaultActivity = getPageSectionQuestionCount(activity.pages[0]);
    const pageSectionQuestionCountHiddenActivity = getPageSectionQuestionCount(activityHidden.pages[0]);
    expect(pageSectionQuestionCountDefaultActivity.Header).toBe(1);
    expect(pageSectionQuestionCountDefaultActivity.InfoAssessment).toBe(3);
    expect(pageSectionQuestionCountDefaultActivity.InteractiveBlock).toBe(0);
    expect(pageSectionQuestionCountHiddenActivity.Header).toBe(0);
    expect(pageSectionQuestionCountHiddenActivity.InfoAssessment).toBe(2);
    expect(pageSectionQuestionCountHiddenActivity.InteractiveBlock).toBe(0);
  });
  it("gets the number of questions on previous pages", () => {
    const numQuestionBeforePage0 = numQuestionsOnPreviousPages(0, activityHidden);
    const numQuestionBeforePage1 = numQuestionsOnPreviousPages(1, activityHidden);
    const numQuestionBeforePage2 = numQuestionsOnPreviousPages(2, activityHidden);
    const numQuestionBeforePage3 = numQuestionsOnPreviousPages(3, activityHidden);
    expect(numQuestionBeforePage0).toBe(0); // should never be questions before intro
    expect(numQuestionBeforePage1).toBe(0); // should never be questions before page 1
    expect(numQuestionBeforePage2).toBe(2); // should never be questions before page 1, 1 question should be hidden
    expect(numQuestionBeforePage3).toBe(2); // hidden page should not be counted
  });
});
