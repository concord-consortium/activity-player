import { EmbeddableType, IManagedInteractive, IMwInteractive, Page, SectionType } from "../types";
import { DefaultManagedInteractive, DefaultTestPage, DefaultTestSection, DefaultXhtmlComponent } from "../test-utils/model-for-tests";
import { ActivityLayouts } from "./activity-utils";
import {
  GateStatus, nextGateStatus, parseQuestionGatingParam, planDisabledQuestions, planTabBanners, QuestionGatingSettings
} from "./disabled-questions";

type Column = "primary" | "secondary" | null;

const question = (refId: string, column: Column = null, extra: Partial<IManagedInteractive> = {}): IManagedInteractive =>
  ({ ...DefaultManagedInteractive, ref_id: refId, column, ...extra });
const hiddenNumberQuestion = (refId: string): IManagedInteractive =>
  question(refId, null, { inherit_hide_question_number: false, custom_hide_question_number: true });
const embed = (refId: string, enableLearnerState = false): IMwInteractive =>
  ({ type: "MwInteractive", ref_id: refId, is_hidden: false, is_half_width: false, column: null, enable_learner_state: enableLearnerState });
const text = (refId: string): EmbeddableType => ({ ...DefaultXhtmlComponent, ref_id: refId, column: null });

const section = (embeddables: EmbeddableType[], layout = "full-width", isHidden = false): SectionType =>
  ({ ...DefaultTestSection, layout, embeddables, is_hidden: isHidden });
const page = (...sections: SectionType[]): Page => ({ ...DefaultTestPage, sections });

const gate = (...refIds: string[]): QuestionGatingSettings =>
  Object.fromEntries(refIds.map(refId => [refId, "disable_following_on_page" as const]));

const plan = (p: Page, settings: QuestionGatingSettings, layout = ActivityLayouts.MultiplePages) =>
  planDisabledQuestions(p, layout, settings);

describe("parseQuestionGatingParam", () => {
  it("parses a comma-separated list of ref ids", () => {
    expect(parseQuestionGatingParam(undefined)).toEqual({});
    expect(parseQuestionGatingParam("")).toEqual({});
    expect(parseQuestionGatingParam("a")).toEqual({ a: "disable_following_on_page" });
    expect(parseQuestionGatingParam(" a, b ,,")).toEqual({ a: "disable_following_on_page", b: "disable_following_on_page" });
  });
});

describe("planDisabledQuestions", () => {
  it("disables the questions after the gating item, skipping content that saves no state", () => {
    const p = page(section([text("text"), embed("model", true), question("q1"), embed("image"), hiddenNumberQuestion("q2")]));
    expect(plan(p, gate("model"))).toEqual({ model: ["q1", "q2"] });
  });

  it("acts only on disable_following_on_page", () => {
    const p = page(section([embed("model", true), question("q1")]));
    expect(plan(p, { model: "none" })).toEqual({});
  });

  it("leaves questions before the gating item alone", () => {
    const p = page(section([question("q0"), embed("model", true), question("q1")]));
    expect(plan(p, gate("model"))).toEqual({ model: ["q1"] });
  });

  it("reaches later visible sections but not hidden sections or hidden embeddables", () => {
    const p = page(
      section([embed("model", true)]),
      section([question("hiddenSectionQ")], "full-width", true),
      section([question("q1"), { ...question("hiddenQ"), is_hidden: true }, question("q2")])
    );
    expect(plan(p, gate("model"))).toEqual({ model: ["q1", "q2"] });
  });

  it("follows question-numbering order in split layouts", () => {
    const fortySixty = section([question("model", "primary"), question("qA", "secondary"), question("qB", "secondary")], "40-60");
    expect(plan(page(fortySixty), gate("model"))).toEqual({ model: [] });
    expect(plan(page(fortySixty), gate("model"), ActivityLayouts.SinglePage)).toEqual({ model: ["qA", "qB"] });

    const sixtyForty = section([question("qA", "secondary"), question("model", "primary"), question("qB", "primary")], "60-40");
    expect(plan(page(sixtyForty), gate("model"))).toEqual({ model: ["qB", "qA"] });
  });

  it("ignores gating ids that are missing, hidden, or save no state", () => {
    const p = page(section([{ ...embed("hidden", true), is_hidden: true }, text("text"), embed("noState"), question("q1")]));
    expect(plan(p, gate("missing"))).toEqual({});
    expect(plan(p, gate("hidden"))).toEqual({});
    expect(plan(p, gate("text"))).toEqual({});
    expect(plan(p, gate("noState"))).toEqual({});
  });

  it("plans each of several gating items", () => {
    const p = page(section([embed("m1", true), question("q1"), embed("m2", true), question("q2")]));
    expect(plan(p, gate("m1", "m2"))).toEqual({ m1: ["q1", "m2", "q2"], m2: ["q2"] });
  });
});

describe("planTabBanners", () => {
  const tabsOf = (p: Page, settings: QuestionGatingSettings) => {
    const tabs = planTabBanners(p, plan(p, settings, ActivityLayouts.Notebook));
    return Object.fromEntries(Object.entries(tabs).map(([refId, sections]) => [refId, sections.map(s => p.sections.indexOf(s) + 1)]));
  };

  it("lists the later tabs that hold a disabled question", () => {
    const p = page(section([embed("m", true), question("q1")]), section([text("t")]), section([question("q2")]));
    expect(tabsOf(p, gate("m"))).toEqual({ m: [3] });
  });

  it("includes the next tab when the first disabled question is in it", () => {
    const p = page(section([question("q0"), embed("m", true)]), section([question("q1")]), section([question("q2")]));
    expect(tabsOf(p, gate("m"))).toEqual({ m: [2, 3] });
  });

  it("joins a gating item to the banner already covering its first question's tab", () => {
    const p = page(section([embed("a", true), question("q1")]), section([embed("b", true), question("q2")]), section([question("q3")]));
    expect(tabsOf(p, gate("a", "b"))).toEqual({ a: [2, 3], b: [2, 3] });
  });
});

describe("nextGateStatus", () => {
  it.each<[GateStatus, boolean, GateStatus]>([
    ["loading", false, "locked"],
    ["loading", true, "unlockedOnLoad"],
    ["locked", false, "locked"],
    ["locked", true, "unlockedDuringVisit"],
    ["unlockedOnLoad", false, "unlockedOnLoad"],
    ["unlockedOnLoad", true, "unlockedOnLoad"],
    ["unlockedDuringVisit", false, "unlockedDuringVisit"],
    ["unlockedDuringVisit", true, "unlockedDuringVisit"],
  ])("moves %s with saved state %s to %s", (status, hasSavedState, expected) => {
    expect(nextGateStatus(status, hasSavedState)).toBe(expected);
  });
});
