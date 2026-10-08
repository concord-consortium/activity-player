import React from "react";
import { act, render } from "@testing-library/react";
import { EmbeddableType, IManagedInteractive, Page, SectionType } from "../../types";
import { DefaultManagedInteractive, DefaultTestPage, DefaultTestSection } from "../../test-utils/model-for-tests";
import { ActivityLayouts } from "../../utilities/activity-utils";
import { PortalDataContext } from "../portal-data-context";
import { DisabledQuestionsProvider, useQuestionGateReporter, useQuestionLock, useTabBanner } from "./disabled-questions-context";
import { defaultLockedBannerText, GateEvent, kDefaultUnlockedBannerText } from "../../utilities/disabled-questions";

const question = (refId: string, extra: Partial<IManagedInteractive> = {}): EmbeddableType =>
  ({ ...DefaultManagedInteractive, ref_id: refId, column: null, ...extra });
const section = (...embeddables: EmbeddableType[]): SectionType =>
  ({ ...DefaultTestSection, layout: "full-width", embeddables });
const pageOf = (...sections: SectionType[]): Page => ({ ...DefaultTestPage, sections });

const setQuery = (query: string) => window.history.replaceState({}, "", `/${query}`);

const gateReporters: Record<string, ((event: GateEvent) => void) | undefined> = {};
const report = (refId: string, event: GateEvent) => {
  const reporter = gateReporters[refId];
  if (!reporter) throw new Error(`${refId} has no gate reporter`);
  act(() => reporter(event));
};
const declare = (refId: string, hasState = false) => report(refId, { type: "declared", hasState });
const unlock = (refId: string, restored = false) => report(refId, { type: "unlocked", restored });
const endRestoreWindow = (refId: string) => report(refId, { type: "restoreWindowEnded" });
const endDeclarationWindow = (refId: string) => report(refId, { type: "declarationWindowEnded" });
const failStateRead = (refId: string) => report(refId, { type: "stateUnavailable" });

const GateProbe: React.FC<{ refId: string }> = ({ refId }) => {
  gateReporters[refId] = useQuestionGateReporter(refId);
  return null;
};
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
  const allRefIds = page.sections.flatMap(s => s.embeddables.map(e => e.ref_id));
  const result = render(
    <PortalDataContext.Provider value={portalData}>
      <DisabledQuestionsProvider page={page} activityLayout={activityLayout} teacherEditionMode={teacherEditionMode}>
        {allRefIds.map(refId => <GateProbe key={refId} refId={refId} />)}
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
const lockedBanner = { state: "locked", text: defaultLockedBannerText(undefined) };
const unlockedBanner = { state: "unlocked", text: kDefaultUnlockedBannerText };

describe("DisabledQuestionsProvider", () => {
  const page = pageOf(section(question("q0"), question("model"), question("q1"), question("q2")));
  const refIds = ["q0", "q1", "q2"];

  beforeEach(() => Object.keys(gateReporters).forEach(refId => delete gateReporters[refId]));

  afterEach(() => setQuery(""));

  it("changes nothing and gives no item a reporter without gating", () => {
    const { read } = renderProbe({ page, refIds });
    expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    expect(Object.values(gateReporters).filter(Boolean)).toHaveLength(0);
  });

  it("gives a reporter only to the gates on the page", () => {
    setQuery("?override:disableQuestionsAfter=model");
    renderProbe({ page, refIds });
    expect(Object.keys(gateReporters).filter(refId => gateReporters[refId])).toEqual(["model"]);
  });

  it("disables without graying while the gate is loading", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const { read } = renderProbe({ page, refIds });
    expect(read()).toEqual({ q0: unlocked, q1: loading, q2: loading });
  });

  it("locks with a banner on the first question once the gate declares without state, then unlocks during the visit", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const { read } = renderProbe({ page, refIds });
    declare("model");
    expect(read()).toEqual({ q0: unlocked, q1: { ...locked, banner: lockedBanner }, q2: locked });
    unlock("model");
    expect(read()).toEqual({ q0: unlocked, q1: { ...unlocked, banner: unlockedBanner }, q2: unlocked });
    unlock("model");
    declare("model");
    expect(read()).toEqual({ q0: unlocked, q1: { ...unlocked, banner: unlockedBanner }, q2: unlocked });
  });

  describe("a gate that declares with state", () => {
    it("stays loading, then opens with no banner on a restored unlock", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const { read } = renderProbe({ page, refIds });
      declare("model", true);
      expect(read()).toEqual({ q0: unlocked, q1: loading, q2: loading });
      unlock("model", true);
      expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
      endRestoreWindow("model");
      expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    });

    it("locks when the restore window ends", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const { read } = renderProbe({ page, refIds });
      declare("model", true);
      endRestoreWindow("model");
      expect(read()).toEqual({ q0: unlocked, q1: { ...locked, banner: lockedBanner }, q2: locked });
    });
  });

  it("opens a gate that is unlocked while still loading, with no banner", () => {
    setQuery("?override:disableQuestionsAfter=model");
    const { read } = renderProbe({ page, refIds });
    unlock("model");
    expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
  });

  describe("a gate that never declares", () => {
    it("opens when its declaration window ends, without ever graying its questions, and ignores a late declaration", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { read } = renderProbe({ page, refIds });
      expect(read()).toEqual({ q0: unlocked, q1: loading, q2: loading });
      endDeclarationWindow("model");
      expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
      declare("model");
      expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
      warn.mockRestore();
    });

    it("warns once, naming the gate, however many windows end", () => {
      const named = pageOf(section(question("model", { name: "Wildfire", question_gating: "disable_following_on_page" }), question("q1")));
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      renderProbe({ page: named, refIds: ["q1"] });
      endDeclarationWindow("model");
      endDeclarationWindow("model");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain("model");
      expect(warn.mock.calls[0][0]).toContain("Wildfire");
      warn.mockRestore();
    });

    it("does not warn about a gate that declared before a window ended", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { read } = renderProbe({ page, refIds });
      declare("model");
      endDeclarationWindow("model");
      expect(read()).toEqual({ q0: unlocked, q1: { ...locked, banner: lockedBanner }, q2: locked });
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe("a gate whose saved state cannot be read", () => {
    it("opens while loading, without the never-declared warning", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { read } = renderProbe({ page, refIds });
      failStateRead("model");
      expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it("stays locked when the read fails after it declared", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const { read } = renderProbe({ page, refIds });
      declare("model");
      failStateRead("model");
      expect(read()).toEqual({ q0: unlocked, q1: { ...locked, banner: lockedBanner }, q2: locked });
    });
  });

  it("disables nothing and gives no reporter in Teacher Edition or on a locked offering", () => {
    setQuery("?override:disableQuestionsAfter=model");
    expect(renderProbe({ page, refIds, teacherEditionMode: true }).read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    expect(gateReporters.model).toBeUndefined();
    const lockedOffering = { offering: { id: 1, activityUrl: "", rubricUrl: "", locked: true } };
    expect(renderProbe({ page, refIds, portalData: lockedOffering }).read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
    expect(gateReporters.model).toBeUndefined();
  });

  describe("with authored gating", () => {
    const authoredPage = pageOf(section(
      question("q0"),
      question("model", {
        question_gating: "disable_following_on_page",
        question_gating_locked_text: "Run the model.",
        question_gating_unlocked_text: "Nice run!"
      }),
      question("q1"),
      question("q2")
    ));

    it("locks with the authored banner texts and no parameter", () => {
      const { read } = renderProbe({ page: authoredPage, refIds });
      expect(read()).toEqual({ q0: unlocked, q1: loading, q2: loading });
      declare("model");
      expect(read()).toEqual({ q0: unlocked, q1: { ...locked, banner: { state: "locked", text: "Run the model." } }, q2: locked });
      unlock("model");
      expect(read()).toEqual({ q0: unlocked, q1: { ...unlocked, banner: { state: "unlocked", text: "Nice run!" } }, q2: unlocked });
    });

    it("warns about a repeated parameter and still applies the authored gating", () => {
      setQuery("?override:disableQuestionsAfter=q0&override:disableQuestionsAfter=q0");
      const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const { read } = renderProbe({ page: authoredPage, refIds });
      expect(read()).toEqual({ q0: unlocked, q1: loading, q2: loading });
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });

    it("names the gate in the default locked text", () => {
      const named = pageOf(section(question("model", { name: "Wildfire Explorer", question_gating: "disable_following_on_page" }), question("q1")));
      const { read } = renderProbe({ page: named, refIds: ["q1"] });
      declare("model");
      expect(read()).toEqual({ q1: { ...locked, banner: { state: "locked", text: "Use Wildfire Explorer to unlock these questions." } } });
    });

    it("keeps a first question shared by side-by-side gates locked, with its first locked gate's text, until both unlock", () => {
      const gate = (refId: string) => question(refId, {
        question_gating: "disable_following_in_section",
        question_gating_locked_text: `${refId} locked`,
        question_gating_unlocked_text: `${refId} unlocked`
      });
      const sideBySide = pageOf({ ...section(
        { ...gate("A"), column: "primary" }, { ...question("Q1"), column: "primary" },
        { ...gate("B"), column: "secondary" }, { ...question("Q2"), column: "secondary" }
      ), layout: "60-40" });
      const { read } = renderProbe({ page: sideBySide, refIds: ["Q1"] });
      declare("A");
      declare("B");
      unlock("B");
      expect(read()).toEqual({ Q1: { ...locked, banner: { state: "locked", text: "A locked" } } });
      unlock("A");
      expect(read()).toEqual({ Q1: { ...unlocked, banner: { state: "unlocked", text: "A unlocked" } } });
    });
  });

  describe("notebook tab banners", () => {
    it("shows the banner on later tabs and before the first question in the gate's own tab", () => {
      const tabs = [section(question("m"), question("q1")), section(question("q2")), section(question("q3"))];
      setQuery("?override:disableQuestionsAfter=m");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q1"], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      declare("m");
      expect(read()).toEqual({ q1: { ...locked, banner: lockedBanner }, tab1: "none", tab2: lockedBanner, tab3: lockedBanner });
      unlock("m");
      expect(read()).toEqual({ q1: { ...unlocked, banner: unlockedBanner }, tab1: "none", tab2: unlockedBanner, tab3: unlockedBanner });
    });

    it("leaves the question banner off when the first disabled question is in a later tab", () => {
      const tabs = [section(question("m")), section(question("q1")), section(question("q2"))];
      setQuery("?override:disableQuestionsAfter=m");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q1"], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      declare("m");
      expect(read()).toEqual({ q1: locked, tab1: "none", tab2: lockedBanner, tab3: lockedBanner });
    });

    it("keeps a covered tab locked while a gate inside it is locked", () => {
      const tabs = [section(question("a"), question("q1")), section(question("b"), question("q2")), section(question("q3"))];
      setQuery("?override:disableQuestionsAfter=a,b");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q2"], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      declare("a");
      declare("b");
      unlock("a");
      expect(read()).toEqual({ q2: locked, tab1: "none", tab2: lockedBanner, tab3: lockedBanner });
    });

    it("gives a tab one banner for several gates: locked while any is locked, none when all opened on load", () => {
      const tabs = [section(question("a"), question("b")), section(question("q1"))];
      setQuery("?override:disableQuestionsAfter=a,b");
      const first = renderProbe({ page: pageOf(...tabs), refIds: [], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      declare("a");
      declare("b");
      unlock("a");
      expect(first.read()).toEqual({ tab1: "none", tab2: lockedBanner });
      unlock("b");
      expect(first.read()).toEqual({ tab1: "none", tab2: unlockedBanner });
      first.unmount();

      const second = renderProbe({ page: pageOf(...tabs), refIds: [], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      unlock("a", true);
      unlock("b", true);
      expect(second.read()).toEqual({ tab1: "none", tab2: "none" });
    });

    it("shows no unlocked tab banner while another gate reaching the tab is still loading", () => {
      const tabs = [section(question("a"), question("b")), section(question("q1"))];
      setQuery("?override:disableQuestionsAfter=a,b");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: [], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      declare("a");
      unlock("a");
      expect(read()).toEqual({ tab1: "none", tab2: "none" });
      unlock("b", true);
      expect(read()).toEqual({ tab1: "none", tab2: unlockedBanner });
    });

    it("carries the authored text of the gates that reach the tab", () => {
      const tabs = [section(question("m", {
        question_gating: "disable_following_on_page",
        question_gating_locked_text: "Run the model.",
        question_gating_unlocked_text: "Nice run!"
      })), section(question("q1"))];
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: [], activityLayout: ActivityLayouts.Notebook, probeSections: tabs });
      declare("m");
      expect(read()).toEqual({ tab1: "none", tab2: { state: "locked", text: "Run the model." } });
      unlock("m");
      expect(read()).toEqual({ tab1: "none", tab2: { state: "unlocked", text: "Nice run!" } });
    });

    it("shows no tab banners outside the notebook layout", () => {
      const tabs = [section(question("m"), question("q1")), section(question("q2"))];
      setQuery("?override:disableQuestionsAfter=m");
      const { read } = renderProbe({ page: pageOf(...tabs), refIds: ["q1"], probeSections: tabs });
      declare("m");
      expect(read()).toEqual({ q1: { ...locked, banner: lockedBanner }, tab1: "none", tab2: "none" });
    });
  });

  describe("unlock announcements", () => {
    const announcer = (container: HTMLElement) => container.querySelector('[data-cy="disabled-questions-announcer"]');

    it("renders no live region without gating", () => {
      const { container } = renderProbe({ page, refIds });
      expect(announcer(container)).toBeNull();
    });

    it("announces each unlock during the visit from the page's live region", () => {
      const twoGates = pageOf(section(question("m1"), question("q1"), question("m2"), question("q2")));
      setQuery("?override:disableQuestionsAfter=m1,m2");
      const { container } = renderProbe({ page: twoGates, refIds: [] });
      declare("m1");
      declare("m2");
      expect(announcer(container)?.getAttribute("role")).toBe("status");
      expect(announcer(container)?.textContent).toBe("");

      unlock("m1");
      const first = announcer(container)?.firstElementChild;
      expect(first?.textContent).toBe(kDefaultUnlockedBannerText);

      unlock("m2");
      const second = announcer(container)?.firstElementChild;
      expect(second?.textContent).toBe(kDefaultUnlockedBannerText);
      expect(second).not.toBe(first);
    });

    it("announces each gate's own unlocked text", () => {
      const gate = (refId: string) =>
        question(refId, { question_gating: "disable_following_on_page", question_gating_unlocked_text: `${refId} unlocked` });
      const twoGates = pageOf(section(gate("m1"), question("q1"), gate("m2"), question("q2")));
      const { container } = renderProbe({ page: twoGates, refIds: [] });
      declare("m1");
      declare("m2");
      unlock("m2");
      expect(announcer(container)?.textContent).toBe("m2 unlocked");
      unlock("m1");
      expect(announcer(container)?.textContent).toBe("m1 unlocked");
    });

    it("announces nothing for a gate with no questions after it", () => {
      setQuery("?override:disableQuestionsAfter=q2");
      const { container } = renderProbe({ page, refIds });
      declare("q2");
      unlock("q2");
      expect(announcer(container)?.textContent).toBe("");
    });

    it("announces nothing for a restored unlock, even of a locked gate", () => {
      setQuery("?override:disableQuestionsAfter=model");
      const { container, read } = renderProbe({ page, refIds });
      declare("model");
      unlock("model", true);
      expect(read()).toEqual({ q0: unlocked, q1: unlocked, q2: unlocked });
      expect(announcer(container)?.textContent).toBe("");
    });
  });
});
