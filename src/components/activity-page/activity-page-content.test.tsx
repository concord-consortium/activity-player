import React from "react";
import { ActivityPageContent } from "./activity-page-content";
import { act, configure, render, screen } from "@testing-library/react";
import { DefaultManagedInteractive, DefaultTestPage, DefaultTestActivity, DefaultTestSection } from "../../test-utils/model-for-tests";
import { DynamicTextTester } from "../../test-utils/dynamic-text";
import { EmbeddableVisibilityTracker } from "../../utilities/embeddable-visibility-tracker";
import { answerWatchers, kSavedAnswer } from "../../test-utils/answer-watchers";
import { kLockedBannerText, kUnlockedBannerText } from "./disabled-questions-banner";

jest.mock("../../firebase-db", () => jest.requireActual("../../test-utils/answer-watchers").firebaseDbMock);

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
    const model = { ...DefaultManagedInteractive, ref_id: "1-ManagedInteractive", name: "Model", column: null };
    const q1 = { ...DefaultManagedInteractive, ref_id: "2-ManagedInteractive", name: "Q1", column: null };
    const gatedPage = { ...DefaultTestPage, sections: [{ ...DefaultTestSection, layout: "full-width", embeddables: [model, q1] }] };

    beforeEach(() => {
      answerWatchers.reset();
      window.history.replaceState({}, "", "/?override:disableQuestionsAfter=1-ManagedInteractive");
    });
    afterEach(() => window.history.replaceState({}, "", "/"));

    const q1Runtime = (container: HTMLElement) =>
      container.querySelector(`iframe[id="${q1.ref_id}"]`)?.closest('[data-cy="iframe-runtime"]');

    it("locks the questions after it until it saves state", () => {
      const { container } = render(
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
      act(() => {
        answerWatchers.report(model.ref_id, null);
        answerWatchers.report(q1.ref_id, null);
      });
      const banner = () => container.querySelector('[data-cy="disabled-questions-banner"]')?.textContent;
      expect(banner()).toBe(kLockedBannerText);
      expect(screen.getByRole("status").textContent).toBe("");
      expect(q1Runtime(container)?.hasAttribute("inert")).toBe(true);

      act(() => answerWatchers.report(model.ref_id, kSavedAnswer));
      expect(banner()).toBe(kUnlockedBannerText);
      expect(screen.getByRole("status").textContent).toBe(kUnlockedBannerText);
      expect(q1Runtime(container)?.hasAttribute("inert")).toBe(false);
    });
  });
});
