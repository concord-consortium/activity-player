import React from "react";
import { SinglePageContent } from "./single-page-content";
import { shallow } from "enzyme";
import { act, render, screen } from "@testing-library/react";
import { Activity } from "../../types";
import {
  DefaultLibraryInteractive, DefaultManagedInteractive, DefaultTestActivity, DefaultTestPage, DefaultTestSection
} from "../../test-utils/model-for-tests";
import _activitySinglePage from "../../data/version-2/sample-new-sections-single-page-layout.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";
import { EmbeddableVisibilityTracker } from "../../utilities/embeddable-visibility-tracker";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { answerWatchers } from "../../test-utils/answer-watchers";
import { iframePhones } from "../../test-utils/iframe-phones";

jest.mock("../../firebase-db", () => jest.requireActual("../../test-utils/answer-watchers").firebaseDbMock);
jest.mock("iframe-phone", () => jest.requireActual("../../test-utils/iframe-phones").iframePhoneMock);

const activitySinglePage = _activitySinglePage as Activity;

describe("Single Page Content component", () => {
  it("renders component", () => {
    const wrapper = shallow(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    expect(wrapper.html()).toContain('data-cy="single-page-content"');
  });
  it("renders component content", () => {
    const wrapper = shallow(<DynamicTextTester><SinglePageContent activity={activitySinglePage} pluginsLoaded={true} /></DynamicTextTester>);
    expect(wrapper.html()).toContain('data-cy="single-page-content"');
    expect(wrapper.html().split('<div class="section').length).toBe(7); // 6 sections = 7 split parts
  });
  it("tracks embeddable visibility while mounted", () => {
    const start = jest.spyOn(EmbeddableVisibilityTracker.prototype, "start");
    const dispose = jest.spyOn(EmbeddableVisibilityTracker.prototype, "dispose");
    const { unmount } = render(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    expect(start).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
    start.mockRestore();
    dispose.mockRestore();
  });
  it("exposes a single main landmark", () => {
    render(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
  it("renders the activity name as the page h1", () => {
    render(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("name");
  });

  describe("with a gating item", () => {
    const interactive = (refId: string) => ({ ...DefaultManagedInteractive, ref_id: refId, name: refId, column: null });
    const model = {
      ...interactive("model"),
      question_gating: "disable_following_on_page",
      library_interactive: { ...DefaultLibraryInteractive, data: { ...DefaultLibraryInteractive.data, base_url: "https://example.com/model/" } }
    };
    const pageWith = (position: number, embeddables: ReturnType<typeof interactive>[]) =>
      ({ ...DefaultTestPage, id: position, position, sections: [{ ...DefaultTestSection, layout: "full-width", embeddables }] });
    const activity: Activity = {
      ...DefaultTestActivity, layout: ActivityLayouts.SinglePage, pages: [pageWith(1, [model, interactive("q1")]), pageWith(2, [interactive("q2")])]
    };

    beforeEach(() => {
      jest.useFakeTimers();
      answerWatchers.reset();
      iframePhones.reset();
    });
    afterEach(() => jest.useRealTimers());

    it("ends the gating item's reach with its authored page", () => {
      const { container } = render(<DynamicTextTester><SinglePageContent activity={activity} pluginsLoaded={true} /></DynamicTextTester>);
      act(() => ["model", "q1", "q2"].forEach(refId => answerWatchers.report(refId, null)));
      act(() => { jest.advanceTimersByTime(0); });
      act(() => iframePhones.dispatch("model", "supportedFeatures", { features: { questionGating: true } }));
      const runtimeIsInert = (refId: string) =>
        container.querySelector(`iframe[id="${refId}"]`)?.closest('[data-cy="iframe-runtime"]')?.hasAttribute("inert");
      expect(runtimeIsInert("q1")).toBe(true);
      expect(runtimeIsInert("q2")).toBe(false);
      expect(container.querySelectorAll('[data-cy="disabled-questions-banner"]')).toHaveLength(1);
    });
  });
});
