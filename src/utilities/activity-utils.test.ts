import { Activity } from "../types";
import { isQuestion, numQuestionsOnPreviousPages, enableReportButton, getPagePositionFromQueryValue, isSectionHidden, numQuestionsOnPreviousSections, getPageIDFromPosition } from "./activity-utils";
import _activityHidden from "../data/version-2/sample-new-sections-hidden-content.json";
import _activity from "../data/version-2/sample-new-sections-activity-1.json";
import { DefaultTestActivity } from "../test-utils/model-for-tests";

const activityHidden = _activityHidden as unknown as Activity;
const activity = _activity as unknown as Activity;

describe("Activity utility functions", () => {
  it("determines if embeddable is a question", () => {
    const isE0Question = isQuestion(activity.pages[0].sections[0].embeddables[0]);
    const isE1Question = isQuestion(activity.pages[0].sections[1].embeddables[0]);
    const isE2Question = isQuestion(activity.pages[1].sections[0].embeddables[0]);
    const isE3Question = isQuestion(activity.pages[1].sections[1].embeddables[0]);
    expect(isE0Question).toBe(false); // text block
    expect(isE1Question).toBe(true);
    expect(isE2Question).toBe(false); // text block
    expect(isE3Question).toBe(true);// enable_learner_state true
  });
  it("determines if section is hidden", () => {
    const hiddenActivityHeaderHidden = isSectionHidden(activityHidden.pages[0].sections[0]);
    const hiddenActivitySectionHidden = isSectionHidden(activityHidden.pages[2].sections[1]);
    expect(hiddenActivityHeaderHidden).toBe(false);
    expect(hiddenActivitySectionHidden).toBe(true);
  });
  it("gets the number of questions in previous sections", () => {
    const pageSectionQuestionCountDefaultActivity = numQuestionsOnPreviousSections(1, activity.pages[0].sections);
    const pageSectionQuestionCountHiddenActivity = numQuestionsOnPreviousSections(2, activityHidden.pages[2].sections);
    expect(pageSectionQuestionCountDefaultActivity).toBe(0);
    expect(pageSectionQuestionCountHiddenActivity).toBe(4);
  });
  it("gets the number of questions on previous pages", () => {
    const numQuestionBeforePage0 = numQuestionsOnPreviousPages(0, activityHidden);
    const numQuestionBeforePage1 = numQuestionsOnPreviousPages(1, activityHidden);
    const numQuestionBeforePage2 = numQuestionsOnPreviousPages(2, activityHidden);
    const numQuestionBeforePage3 = numQuestionsOnPreviousPages(3, activityHidden);
    expect(numQuestionBeforePage0).toBe(0); // should never be questions before intro
    expect(numQuestionBeforePage1).toBe(0); // should never be questions before page 1
    expect(numQuestionBeforePage2).toBe(2); // hidden page should not be counted
    expect(numQuestionBeforePage3).toBe(4); // this is the completion page
  });
  it("determines if report button is enabled", () => {
    const defaultActivityReportEnabled = enableReportButton(DefaultTestActivity);
    expect(defaultActivityReportEnabled).toBe(false);
    DefaultTestActivity.student_report_enabled = true;
    const modifiedDefaultActivityReportEnabled = enableReportButton(DefaultTestActivity);
    expect(modifiedDefaultActivityReportEnabled).toBe(true);
  });
  it("gets the page position from the query value", () => {
    expect(getPagePositionFromQueryValue(activity)).toBe(0);
    expect(getPagePositionFromQueryValue(activity, undefined)).toBe(0);
    expect(getPagePositionFromQueryValue(activity, "0")).toBe(0);
    expect(getPagePositionFromQueryValue(activity, "1")).toBe(1);
    expect(getPagePositionFromQueryValue(activity, "-1")).toBe(0);
    expect(getPagePositionFromQueryValue(activity, "1000")).toBe(activity.pages.length);
    expect(getPagePositionFromQueryValue(activity, "foo")).toBe(0);
    expect(getPagePositionFromQueryValue(activity, "page_foo")).toBe(0);
    expect(getPagePositionFromQueryValue(activity, "page_1000")).toBe(1);
    expect(getPagePositionFromQueryValue(activity, "page_1001")).toBe(0);
    expect(getPagePositionFromQueryValue(activity, "page_2000")).toBe(2);
    expect(getPagePositionFromQueryValue(activity, "page_3000")).toBe(3);
  });
  it("determines the page ID from the page's position value", () => {
    expect(getPageIDFromPosition(activity, 1)).toBe(1000);
    expect(getPageIDFromPosition(activity, 2)).toBe(2000);
    expect(getPageIDFromPosition(activity, 3)).toBe(3000);
  });
});
