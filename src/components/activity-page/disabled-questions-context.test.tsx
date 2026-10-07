import React from "react";
import { act, render } from "@testing-library/react";
import { EmbeddableType, Page, SectionType } from "../../types";
import { DefaultManagedInteractive, DefaultTestPage, DefaultTestSection } from "../../test-utils/model-for-tests";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { PortalDataContext } from "../portal-data-context";
import { DisabledQuestionsProvider, useQuestionLock, useTabBanner } from "./disabled-questions-context";
import type { WrappedDBAnswer } from "../../firebase-db";
import { answerWatchers, kSavedAnswer } from "../../test-utils/answer-watchers";
import { kUnlockedBannerText } from "./disabled-questions-banner";

jest.mock("../../firebase-db", () => jest.requireActual("../../test-utils/answer-watchers").firebaseDbMock);

const report = (refId: string, answer: WrappedDBAnswer | null) => act(() => answerWatchers.report(refId, answer));

const question = (refId: string): EmbeddableType => ({ ...DefaultManagedInteractive, ref_id: refId, column: null });
const section = (...embeddables: EmbeddableType[]): SectionType =>
  ({ ...DefaultTestSection, layout: "full-width", embeddables });
const pageOf = (...sections: SectionType[]): Page => ({ ...DefaultTestPage, sections });

const setQuery = (query: string) => window.history.replaceState({}, "", `/${query}`);

const LockProbe: React.FC<{ refId: string }> = ({ refId }) =>
  <li data-key={refId}>{JSON.stringify(useQuestionLock(refId))}</li>;
const TabProbe: React.FC<{ name: string; tab: SectionType }> = ({ name, tab }) =>
  <li data-key={name}>{JSON.stringify(useTabBanner(tab) ?? "none")}</li>;

interface IRenderOptions {
  page: Page;
  refIds: string[];
  activityLayout?: number;
  teacherEditionMode?: boolean;
  portalData?: any;
  probeSections?: SectionType[];
}
const renderProbe = ({ page, refIds, activityLayout = ActivityLayouts.MultiplePages, teacherEditionMode, portalData, probeSections = [] }: IRenderOptions) => {
  const result = render(
    <PortalDataContext.Provider value={portalData}>
      <DisabledQuestionsProvider page={page} activityLayout={activityLayout} teacherEditionMode={teacherEditionMode}>
        <ul>
          {refIds.map(refId => <LockProbe key={refId} refId={refId} />)}
          {probeSections.map((tab, index) => <TabProbe key={index} name={`tab${index + 1}`} tab={tab} />)}
        </ul>
      </DisabledQuestionsProvider>
    </PortalDataContext.Provider>
  );
  const read = () => Object.fromEntries(Array.from(result.container.querySelectorAll("li"))
    .map(item => [item.getAttribute("data-key"), JSON.parse(item.textContent || "null")]));
  return { ...result, read };
};

const unlocked = { disabled: false, locked: false };
const loading = { disabled: true, locked: false };
const locked = { disabled: true, locked: true };

describe("DisabledQuestionsProvider", () => {
  const page = pageOf(section(question("q0"), question("model"), question("q1"), question("q2")));
  const refIds = ["q0", "q1", "q2"];

  beforeEach(() => answerWatchers.reset());

  afterEach(() => setQuery(""));

  it("changes nothing without the parameter", () => {
    const { read } = renderProbe({ page, refIds });
    expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    expect(answerWatchers.watchAnswer).not.toHaveBeenCalled();
  });

  it("disables without graying while the gate is loading", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const { read } = renderProbe({ page, refIds });
    expect(read()).toEqual({ q0: unlocked, q1: loading, q2: loading });
  });

  it("locks with a banner on the first question, then unlocks during the visit", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const { read } = renderProbe({ page, refIds });
    report("model", null);
    expect(read()).toEqual({ q0: unlocked, q1: { ...locked, banner: "locked" }, q2: locked });
    report("model", kSavedAnswer);
    expect(read()).toEqual({ q0: unlocked, q1: { ...unlocked, banner: "unlocked" }, q2: unlocked });
  });

  it("shows no banner when the gate is already unlocked on load, and stays unlocked", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const { read } = renderProbe({ page, refIds });
    report("model", kSavedAnswer);
    expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    report("model", null);
    expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
  });

  it("shows a gate as locked when its saved state cannot be read", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { read } = renderProbe({ page, refIds });
    act(() => answerWatchers.fail("model", new Error("permission-denied")));
    expect(read()).toEqual({ q0: unlocked, q1: { ...locked, banner: "locked" }, q2: locked });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("disables nothing in Teacher Edition or on a locked offering", () => {
    setQuery("?override:disableQuestionsAfter=model");
    expect(renderProbe({ page, refIds, teacherEditionMode: true }).read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    const lockedOffering = { offering: { id: 1, activityUrl: "", rubricUrl: "", locked: true } };
    expect(renderProbe({ page, refIds, portalData: lockedOffering }).read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    expect(answerWatchers.watchAnswer).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const { unmount } = renderProbe({ page, refIds });
    expect(answerWatchers.subscriberCount("model")).toBe(1);
    unmount();
    expect(answerWatchers.subscriberCount("model")).toBe(0);
  });

  it("warns and disables nothing when the parameter is repeated", () => {
    setQuery("?override:disableQuestionsAfter=model&override:disableQuestionsAfter=q1");
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const { read } = renderProbe({ page, refIds });
    expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  describe("notebook tab banners", () => {
    it("shows the banner on later tabs and before the first question in the gate's own tab", () => {
      const tabs = [section(question("m"), question("q1")), section(question("q2")), section(question("q3"))];
      setQuery("?override:disableQuestionsAfter=m");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q1"], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      report("m", null);
      expect(read()).toEqual({ q1: { ...locked, banner: "locked" }, tab1: "none", tab2: "locked", tab3: "locked" });
      report("m", kSavedAnswer);
      expect(read()).toEqual({ q1: { ...unlocked, banner: "unlocked" }, tab1: "none", tab2: "unlocked", tab3: "unlocked" });
    });

    it("leaves the question banner off when the first disabled question is in a later tab", () => {
      const tabs = [section(question("m")), section(question("q1")), section(question("q2"))];
      setQuery("?override:disableQuestionsAfter=m");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q1"], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      report("m", null);
      expect(read()).toEqual({ q1: locked, tab1: "none", tab2: "locked", tab3: "locked" });
    });

    it("keeps a covered tab locked while a gate inside it is locked", () => {
      const tabs = [section(question("a"), question("q1")), section(question("b"), question("q2")), section(question("q3"))];
      setQuery("?override:disableQuestionsAfter=a,b");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q2"], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      report("a", null);
      report("b", null);
      report("a", kSavedAnswer);
      expect(read()).toEqual({ q2: locked, tab1: "none", tab2: "locked", tab3: "locked" });
    });

    it("gives a tab one banner for several gates: locked while any is locked, none when all opened on load", () => {
      const tabs = [section(question("a"), question("b")), section(question("q1"))];
      setQuery("?override:disableQuestionsAfter=a,b");
      const first = renderProbe({ page: pageOf(...tabs), refIds: [], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      report("a", null);
      report("b", null);
      report("a", kSavedAnswer);
      expect(first.read()).toEqual({ tab1: "none", tab2: "locked" });
      report("b", kSavedAnswer);
      expect(first.read()).toEqual({ tab1: "none", tab2: "unlocked" });
      first.unmount();

      const second = renderProbe({ page: pageOf(...tabs), refIds: [], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      report("a", kSavedAnswer);
      report("b", kSavedAnswer);
      expect(second.read()).toEqual({ tab1: "none", tab2: "none" });
    });

    it("shows no unlocked tab banner while another gate reaching the tab is still loading", () => {
      const tabs = [section(question("a"), question("b")), section(question("q1"))];
      setQuery("?override:disableQuestionsAfter=a,b");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: [], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      report("a", null);
      report("a", kSavedAnswer);
      expect(read()).toEqual({ tab1: "none", tab2: "none" });
      report("b", kSavedAnswer);
      expect(read()).toEqual({ tab1: "none", tab2: "unlocked" });
    });

    it("shows no tab banners outside the notebook layout", () => {
      const tabs = [section(question("m"), question("q1")), section(question("q2"))];
      setQuery("?override:disableQuestionsAfter=m");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q1"], probeSections: tabs });
      report("m", null);
      expect(read()).toEqual({ q1: { ...locked, banner: "locked" }, tab1: "none", tab2: "none" });
    });
  });

  describe("unlock announcements", () => {
    const announcer = (container: HTMLElement) => container.querySelector('[data-cy="disabled-questions-announcer"]');

    it("renders no live region without the parameter", () => {
      const { container } = renderProbe({ page, refIds });
      expect(announcer(container)).toBeNull();
    });

    it("announces each unlock during the visit from the page's live region", () => {
      const twoGates = pageOf(section(question("m1"), question("q1"), question("m2"), question("q2")));
      setQuery("?override:disableQuestionsAfter=m1,m2");
      const { container } = renderProbe({ page: twoGates, refIds: [] });
      report("m1", null);
      report("m2", null);
      expect(announcer(container)?.getAttribute("role")).toBe("status");
      expect(announcer(container)?.textContent).toBe("");

      report("m1", kSavedAnswer);
      const first = announcer(container)?.firstElementChild;
      expect(first?.textContent).toBe(kUnlockedBannerText);

      report("m2", kSavedAnswer);
      const second = announcer(container)?.firstElementChild;
      expect(second?.textContent).toBe(kUnlockedBannerText);
      expect(second).not.toBe(first);
    });

    it("announces nothing for a gate with no questions after it", () => {
      setQuery("?override:disableQuestionsAfter=q2");
      const { container } = renderProbe({ page, refIds });
      report("q2", null);
      report("q2", kSavedAnswer);
      expect(announcer(container)?.textContent).toBe("");
    });

    it("announces nothing for a gate that was already unlocked on load", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const { container } = renderProbe({ page, refIds });
      report("model", kSavedAnswer);
      expect(announcer(container)?.textContent).toBe("");
    });
  });
});

