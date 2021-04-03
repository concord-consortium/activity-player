import fetch from "jest-fetch-mock";

import { Activity } from "../types";
import { isQuestion, isEmbeddableSectionHidden, getVisibleEmbeddablesOnPage, VisibleEmbeddables,
  EmbeddableSections, getPageSectionQuestionCount, numQuestionsOnPreviousPages, enableReportButton, getPagePositionFromQueryValue, isNotSampleActivityUrl, orderedQuestionsOnPage, isExternalOrModelsResourcesUrl, getAllUrlsInActivity, removeDuplicateUrls, rewriteModelsResourcesUrl } from "./activity-utils";
import _activityHidden from "../data/sample-activity-hidden-content.json";
import _activity from "../data/sample-activity-multiple-layout-types.json";
import _glossaryActivity from "../data/sample-activity-glossary-plugin.json";
import { DefaultTestActivity } from "../test-utils/model-for-tests";

(window as any).fetch = fetch;

const activityHidden = _activityHidden as unknown as Activity;
const activity = _activity as unknown as Activity;
const glossaryActivity = _glossaryActivity as unknown as Activity;

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
    expect(visibleEmbeddablesDefaultActivity.headerBlock.length).toBe(6);
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

  it("determines if an activity url is not a sample activity", () => {
    expect(isNotSampleActivityUrl("foo")).toBe(false);
    expect(isNotSampleActivityUrl("http://example.com/foo")).toBe(true);
    expect(isNotSampleActivityUrl("offline-activities/foo")).toBe(true);
  });

  it("Returns an ordered list of questions, taking into account the layout of sections", () => {
    const page = activity.pages[0];
    const expectedRefIds  = [
      "319-ManagedInteractive", // In header block, but defined last
      "312-ManagedInteractive", // Section is null
      "313-ManagedInteractive", // Section is null
      "352-ManagedInteractive"  // Section is null
    ];
    const foundRefIds = orderedQuestionsOnPage(page).map( e=> e.embeddable.ref_id);
    expect(foundRefIds).toEqual(expectedRefIds);
    // In the hidden activity we only expect to find:
    // page0: 2 visible, page1: no visible, page2: 2 visible, page3: 0 visible
    expect(orderedQuestionsOnPage(activityHidden.pages[0]).length).toEqual(2);
    expect(orderedQuestionsOnPage(activityHidden.pages[1]).length).toEqual(0);
    expect(orderedQuestionsOnPage(activityHidden.pages[2]).length).toEqual(2);
    expect(orderedQuestionsOnPage(activityHidden.pages[3]).length).toEqual(0);
  });

  it("determines if string is an external or models resources url", () => {
    expect(isExternalOrModelsResourcesUrl("http://example.com")).toBe(true);
    expect(isExternalOrModelsResourcesUrl("https://example.com")).toBe(true);
    expect(isExternalOrModelsResourcesUrl("models-resources/foo")).toBe(true);  // models-resources is special as it is proxied
    expect(isExternalOrModelsResourcesUrl("bar")).toBe(false);
  });

  it("removes duplicate urls", () => {
    expect(removeDuplicateUrls([
      "http://example.com/",
      "http://example.com/foo",
      "http://example.com/bar",
      "http://example.com/",
      "http://example.com/foo"
    ])).toEqual([
      "http://example.com/",
      "http://example.com/foo",
      "http://example.com/bar"
    ]);
  });

  it("gets all urls in an activity including glossary urls", async () => {

    // first test an activity with no glossary
    let urls = await getAllUrlsInActivity(activity);
    expect(urls).toEqual([
      "https://upload.wikimedia.org/wikipedia/commons/c/c1/Six_weeks_old_cat_%28aka%29.jpg",
      "https://models-resources.concord.org/question-interactives/branch/master/multiple-choice/",
      "https://models-resources.concord.org/question-interactives/branch/master/open-response/",
      "https://connected-bio-spaces.concord.org/",
      "https://s-media-cache-ak0.pinimg.com/originals/73/ec/f3/73ecf348c3ef190be4e8c4a3269fc0d8.jpg",
      // This is an example of a href link that we wouldn't want to cache,
      // but at the same time we probably want to know about it to warn the author
      // This particular one is further complicated because it is inside of a description
      // that is only shown at authoring time, so our getAllUrlsInActivity could be
      // smarter about this
      "https://connected-bio-spaces.concord.org/?authoring",
      "https://www.wikipedia.org/"
    ]);

    // mock the glossary json
    fetch.mockResponse(JSON.stringify({
      askForUserDefinition: true,
      autoShowMediaInPopup: false,
      showSideBar: false,
      definitions: [
        {
          word: "test",
          definition: "this is a test",
          image: "https://token-service-files.s3.amazonaws.com/glossary-plugin/ISnn8j8r2veEFjPCx3XH/5cacbe00-1c44-11ea-90e3-39c0ba8d079c-sticky note.svg",
          zoomImage: "https://token-service-files.s3.amazonaws.com/glossary-plugin/ISnn8j8r2veEFjPCx3XH/5d298f20-1c44-11ea-90e3-39c0ba8d079c-IMG_8603.jpeg"
        }
      ]
    }));

    // then test an activity with a glossary
    urls = await getAllUrlsInActivity(glossaryActivity);
    expect(urls).toEqual([
      "https://models-resources.concord.org/question-interactives/branch/master/open-response/",
      "https://example.com/fake.mp4",
      "https://teacher-edition-tips-plugin.concord.org/version/v3.5.6/plugin.js",
      "https://example.com/manifest.json",
      "https://token-service-files.s3.amazonaws.com/glossary-plugin/ISnn8j8r2veEFjPCx3XH/glossary.json",
      "https://glossary-plugin.concord.org/plugin.js",
      "https://glossary-plugin.concord.org/manifest.json",
      "https://token-service-files.s3.amazonaws.com/glossary-plugin/ISnn8j8r2veEFjPCx3XH/5cacbe00-1c44-11ea-90e3-39c0ba8d079c-sticky note.svg",
      "https://token-service-files.s3.amazonaws.com/glossary-plugin/ISnn8j8r2veEFjPCx3XH/5d298f20-1c44-11ea-90e3-39c0ba8d079c-IMG_8603.jpeg"
    ]);
  });

  it("rewrites some domains to models-resources with trailing slash", () => {
    const rewriteMap: Record<string, string> = {
      "https://models-resources.concord.org/foo": "models-resources/foo/",
      "https://models-resources.concord.org/foo/": "models-resources/foo/",
      "https://models-resources.concord.org/foo/image.jpg": "models-resources/foo/image.jpg",
      "https://models-resources.s3.amazonaws.com/foo": "models-resources/foo/",
      "https://models-resources.s3.amazonaws.com/foo/": "models-resources/foo/",
      "https://models-resources.s3.amazonaws.com/foo/image.jpg": "models-resources/foo/image.jpg",
      // NOTE how non-rewritten urls do not have slashes appended
      "https://non-rewritten-domain.com/foo": "https://non-rewritten-domain.com/foo",
      "https://non-rewritten-domain.com/foo/": "https://non-rewritten-domain.com/foo/"
    };
    Object.keys(rewriteMap).forEach(url => {
      expect(rewriteModelsResourcesUrl(url)).toBe(rewriteMap[url]);
    });
    // Check them all with http for completeness
    Object.keys(rewriteMap).forEach(url => {
      const httpUrl = url.replace("https://", "http://");
      const rewrittenUrl = rewriteMap[url].replace("https://", "http://");
      expect(rewriteModelsResourcesUrl(httpUrl)).toBe(rewrittenUrl);
    });
  });
});
