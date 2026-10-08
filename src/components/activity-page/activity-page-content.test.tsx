import React from "react";
import { ActivityPageContent } from "./activity-page-content";
import { act, configure, fireEvent, render, screen } from "@testing-library/react";
import {
  DefaultLibraryInteractive, DefaultManagedInteractive, DefaultTestPage, DefaultTestActivity, DefaultTestSection
} from "../../test-utils/model-for-tests";
import { DynamicTextTester } from "../../test-utils/dynamic-text";
import { EmbeddableVisibilityTracker } from "../../utilities/embeddable-visibility-tracker";
import { answerWatchers } from "../../test-utils/answer-watchers";
import { iframePhones } from "../../test-utils/iframe-phones";
import { IManagedInteractive } from "../../types";
import { kDefaultUnlockedBannerText } from "../../utilities/disabled-questions";

jest.mock("../../firebase-db", () => jest.requireActual("../../test-utils/answer-watchers").firebaseDbMock);
jest.mock("iframe-phone", () => jest.requireActual("../../test-utils/iframe-phones").iframePhoneMock);

describe("Activity Page Content component", () => {
  const stubFunction = () => {
    // do nothing.
  };
  const page = { ...DefaultTestPage, layout: "l-responsive" };
  configure({ testIdAttribute: "data-cy" });

  it("renders component", () => {
    const { getByTestId, queryAllByTestId } = render(
      <DynamicTextTester>
        <ActivityPageContent
          enableReportButton={false}
          activityLayout={0}
          page={page}
          pageNumber={5}
          activity={DefaultTestActivity}
          totalPreviousQuestions={5}
          setNavigation={stubFunction}
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    expect(getByTestId("page-content")).toBeDefined();

    const notifications = queryAllByTestId("page-change-notification");
    expect(notifications.length).toBe(0);
  });

  it("tracks embeddable visibility while mounted", () => {
    const start = jest.spyOn(EmbeddableVisibilityTracker.prototype, "start");
    const dispose = jest.spyOn(EmbeddableVisibilityTracker.prototype, "dispose");
    const { unmount } = render(
      <DynamicTextTester>
        <ActivityPageContent
          enableReportButton={false}
          activityLayout={0}
          page={page}
          pageNumber={5}
          activity={DefaultTestActivity}
          totalPreviousQuestions={5}
          setNavigation={stubFunction}
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    expect(start).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
    start.mockRestore();
    dispose.mockRestore();
  });

  it("exposes a single main landmark", () => {
    render(
      <DynamicTextTester>
        <ActivityPageContent
          enableReportButton={false}
          activityLayout={0}
          page={page}
          pageNumber={5}
          activity={DefaultTestActivity}
          totalPreviousQuestions={5}
          setNavigation={stubFunction}
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("renders the page title as an h1", () => {
    const namedPage = { ...page, name: "Test Page Title" };
    render(
      <DynamicTextTester>
        <ActivityPageContent
          enableReportButton={false}
          activityLayout={0}
          page={namedPage}
          pageNumber={5}
          activity={DefaultTestActivity}
          totalPreviousQuestions={5}
          setNavigation={stubFunction}
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Test Page Title");
  });

  it("falls back to 'Page N' for the h1 when the page has no name (avoids an empty heading)", () => {
    const unnamedPage = { ...page, name: null };
    render(
      <DynamicTextTester>
        <ActivityPageContent
          enableReportButton={false}
          activityLayout={0}
          page={unnamedPage}
          pageNumber={5}
          activity={DefaultTestActivity}
          totalPreviousQuestions={5}
          setNavigation={stubFunction}
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Page 5");
  });

  describe("with page change notification", () => {
    it("renders page change started notification", () => {
      const { getAllByTestId } = render(
        <DynamicTextTester>
          <ActivityPageContent
            enableReportButton={false}
            activityLayout={0}
            page={page}
            pageNumber={5}
            activity={DefaultTestActivity}
            totalPreviousQuestions={5}
            setNavigation={stubFunction}
            pluginsLoaded={true}
            pageChangeNotification={{state: "started"}}
          />
        </DynamicTextTester>
      );
      const notifications = getAllByTestId("page-change-notification");
      expect(notifications.length).toBe(2);
      expect(notifications[0].textContent).toBe("Please wait, your work is being saved...");
    });

    it("renders page change errored notification", () => {
      const { getAllByTestId } = render(
        <DynamicTextTester>
          <ActivityPageContent
            enableReportButton={false}
            activityLayout={0}
            page={page}
            pageNumber={5}
            activity={DefaultTestActivity}
            totalPreviousQuestions={5}
            setNavigation={stubFunction}
            pluginsLoaded={true}
            pageChangeNotification={{state: "errored", message: "Test error message!"}}
          />
        </DynamicTextTester>
      );
      const notifications = getAllByTestId("page-change-notification");
      expect(notifications.length).toBe(2);
      expect(notifications[0].textContent).toBe("Test error message!");
    });
  });

  describe("with a gating item", () => {
    const model: IManagedInteractive = {
      ...DefaultManagedInteractive,
      ref_id: "1-ManagedInteractive",
      name: "Model",
      column: null,
      question_gating: "disable_following_on_page",
      library_interactive: { ...DefaultLibraryInteractive, data: { ...DefaultLibraryInteractive.data, base_url: "https://example.com/model/" } }
    };
    const q1 = { ...DefaultManagedInteractive, ref_id: "2-ManagedInteractive", name: "Q1", column: null };
    const gatedPage = { ...DefaultTestPage, sections: [{ ...DefaultTestSection, layout: "full-width", embeddables: [model, q1] }] };

    beforeEach(() => {
      jest.useFakeTimers();
      answerWatchers.reset();
      iframePhones.reset();
    });
    afterEach(() => jest.useRealTimers());

    const renderGatedPage = () => render(
      <DynamicTextTester>
        <ActivityPageContent
          enableReportButton={false}
          activityLayout={0}
          page={gatedPage}
          pageNumber={1}
          activity={DefaultTestActivity}
          totalPreviousQuestions={0}
          setNavigation={stubFunction}
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    const loadAnswers = (...refIds: string[]) => act(() => refIds.forEach(refId => answerWatchers.report(refId, null)));
    const connect = () => act(() => { jest.advanceTimersByTime(0); });
    const banner = (container: HTMLElement) => container.querySelector('[data-cy="disabled-questions-banner"]')?.textContent;
    const q1IsInert = (container: HTMLElement) =>
      container.querySelector(`iframe[id="${q1.ref_id}"]`)?.closest('[data-cy="iframe-runtime"]')?.hasAttribute("inert");

    it("locks the questions after it once it declares, and unlocks them when it says so", () => {
      const { container } = renderGatedPage();
      loadAnswers(model.ref_id, q1.ref_id);
      connect();
      expect(q1IsInert(container)).toBe(true);
      expect(banner(container)).toBeUndefined();

      act(() => iframePhones.dispatch(model.ref_id, "supportedFeatures", { features: { questionGating: true } }));
      expect(banner(container)).toBe("Use Model to unlock these questions.");
      expect(screen.getByRole("status").textContent).toBe("");
      expect(q1IsInert(container)).toBe(true);

      act(() => iframePhones.dispatch(model.ref_id, "unlockQuestions", {}));
      expect(banner(container)).toBe(kDefaultUnlockedBannerText);
      expect(screen.getByRole("status").textContent).toBe(kDefaultUnlockedBannerText);
      expect(q1IsInert(container)).toBe(false);
    });

    it("opens the questions when it has not declared 5 seconds after its iframe loads", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { container } = renderGatedPage();
      loadAnswers(model.ref_id, q1.ref_id);
      connect();
      act(() => { jest.advanceTimersByTime(3000); });
      fireEvent.load(container.querySelector(`iframe[id="${model.ref_id}"]`) as HTMLIFrameElement);
      act(() => { jest.advanceTimersByTime(4999); });
      expect(q1IsInert(container)).toBe(true);

      act(() => { jest.advanceTimersByTime(1); });
      expect(q1IsInert(container)).toBe(false);
      expect(banner(container)).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(model.ref_id));
      warn.mockRestore();
    });

    it("keeps a click-to-play gate's questions loading until it is played, then settles it", () => {
      const clickToPlayModel: IManagedInteractive = {
        ...model,
        library_interactive: { ...model.library_interactive!, data: { ...model.library_interactive!.data, click_to_play: true } }
      };
      const { container } = render(
        <DynamicTextTester>
          <ActivityPageContent
            enableReportButton={false}
            activityLayout={0}
            page={{ ...gatedPage, sections: [{ ...gatedPage.sections[0], embeddables: [clickToPlayModel, q1] }] }}
            pageNumber={1}
            activity={DefaultTestActivity}
            totalPreviousQuestions={0}
            setNavigation={stubFunction}
            pluginsLoaded={true}
          />
        </DynamicTextTester>
      );
      loadAnswers(model.ref_id, q1.ref_id);
      act(() => { jest.advanceTimersByTime(10000); });
      expect(container.querySelector(`iframe[id="${model.ref_id}"]`)).toBeNull();
      expect(q1IsInert(container)).toBe(true);
      expect(container.querySelector(".disabled-question")).toBeNull();
      expect(banner(container)).toBeUndefined();

      fireEvent.click(container.querySelector('[data-cy="click-to-play"]') as HTMLElement);
      connect();
      act(() => iframePhones.dispatch(model.ref_id, "supportedFeatures", { features: { questionGating: true } }));
      expect(banner(container)).toBe("Use Model to unlock these questions.");
    });

    it("opens the questions when its saved state cannot be loaded", () => {
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { container } = renderGatedPage();
      loadAnswers(q1.ref_id);
      expect(q1IsInert(container)).toBe(true);

      act(() => answerWatchers.fail(model.ref_id, new Error("permission-denied")));
      expect(q1IsInert(container)).toBe(false);
      expect(banner(container)).toBeUndefined();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("Could not load the saved state"));
      expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("never declared"));
      warn.mockRestore();
    });
  });
});
