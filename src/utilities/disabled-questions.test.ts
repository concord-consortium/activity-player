import { EmbeddableType, IManagedInteractive, IMwInteractive, Page, SectionType } from "../types";
import { DefaultLibraryInteractive, DefaultManagedInteractive, DefaultTestPage, DefaultTestSection, DefaultXhtmlComponent } from "../test-utils/model-for-tests";
import { ActivityLayouts } from "./activity-utils";
import { sampleActivities } from "../data";
import {
  applyGateEvent, combineBanner, GateEvent, gateTexts, GateStatus, IGateState, IGateTexts, nextGateStatus, parseQuestionGatingParam, planDisabledQuestions,
  planTabBanners, QuestionGatingSettings, questionGatingSettings, toQuestionGating
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

  it("limits a ref id ending in :section to its own section", () => {
    expect(parseQuestionGatingParam("9101-MwInteractive:section,b")).toEqual({
      "9101-MwInteractive": "disable_following_in_section",
      b: "disable_following_on_page"
    });
  });
});

describe("toQuestionGating", () => {
  it.each(["none", "disable_following_on_page", "disable_following_in_section"])("keeps %s", value => {
    expect(toQuestionGating(value)).toBe(value);
  });

  it.each([undefined, null, "", "disable_everything", 42])("reads %p as none", value => {
    expect(toQuestionGating(value)).toBe("none");
  });
});

describe("questionGatingSettings", () => {
  const authored = page(section([
    embed("mw", true),
    question("mi"),
    question("off"),
    question("unset"),
    question("odd"),
    question("sectionGate")
  ].map((e, index): EmbeddableType => ({
    ...e,
    question_gating: ["disable_following_on_page", "disable_following_in_section", "none", null, "disable_everything",
      "disable_following_in_section"][index]
  }))));

  it("reads the authored values of both interactive types, leaving out none, null and unknown values", () => {
    expect(questionGatingSettings(authored, undefined)).toEqual({
      mw: "disable_following_on_page",
      mi: "disable_following_in_section",
      sectionGate: "disable_following_in_section"
    });
  });

  it("lets the override add gates and replace the authored values of the items it names", () => {
    expect(questionGatingSettings(authored, "off:section,sectionGate")).toEqual({
      mw: "disable_following_on_page",
      mi: "disable_following_in_section",
      off: "disable_following_in_section",
      sectionGate: "disable_following_on_page"
    });
  });
});

describe("gateTexts", () => {
  const textsOf = (extra: Partial<IManagedInteractive>) => gateTexts(page(section([question("gate", null, extra)]))).gate;

  it("uses authored text, trimmed", () => {
    expect(textsOf({ question_gating_locked_text: "  Run it.  ", question_gating_unlocked_text: "\tDone!\n" }))
      .toEqual({ locked: "Run it.", unlocked: "Done!" });
  });

  it.each([null, undefined, "", "   "])("falls back to each default for %p", authored => {
    expect(textsOf({ question_gating_locked_text: authored, question_gating_unlocked_text: authored })).toEqual({
      locked: "Use the interactive to unlock these questions.",
      unlocked: "The questions are now unlocked!"
    });
  });

  it("falls back for each state independently", () => {
    expect(textsOf({ question_gating_locked_text: "Run it." })).toEqual({ locked: "Run it.", unlocked: "The questions are now unlocked!" });
    expect(textsOf({ question_gating_unlocked_text: "Done!" }))
      .toEqual({ locked: "Use the interactive to unlock these questions.", unlocked: "Done!" });
  });

  it("names the gate in the default locked text when it has a name of its own", () => {
    expect(textsOf({ name: " Wildfire Explorer " }).locked).toBe("Use Wildfire Explorer to unlock these questions.");
    expect(textsOf({ name: "  " }).locked).toBe("Use the interactive to unlock these questions.");
    expect(textsOf({ name: undefined }).locked).toBe("Use the interactive to unlock these questions.");
  });

  it("does not name a managed interactive after its library interactive", () => {
    const library_interactive = { ...DefaultLibraryInteractive, data: { ...DefaultLibraryInteractive.data, name: "Multiple Choice" } };
    expect(textsOf({ name: "", library_interactive }).locked).toBe("Use the interactive to unlock these questions.");
  });

  it("covers interactives of both types and nothing else", () => {
    const p = page(section([embed("mw", true), question("mi"), text("text")]));
    expect(Object.keys(gateTexts(p))).toEqual(["mw", "mi"]);
  });
});

describe("combineBanner", () => {
  const texts: Record<string, IGateTexts> = {
    a: { locked: "a locked", unlocked: "a unlocked" },
    b: { locked: "b locked", unlocked: "b unlocked" }
  };
  const banner = (statuses: Record<string, GateStatus>, unlockOrder: string[] = []) =>
    combineBanner(["a", "b"], refId => statuses[refId], unlockOrder, refId => texts[refId]);

  it("uses the first locked gate's text in page order", () => {
    expect(banner({ a: "locked", b: "locked" })).toEqual({ state: "locked", text: "a locked" });
    expect(banner({ a: "unlockedDuringVisit", b: "locked" }, ["a"])).toEqual({ state: "locked", text: "b locked" });
  });

  it("shows nothing while a gate that is not locked is still loading", () => {
    expect(banner({ a: "loading", b: "unlockedDuringVisit" }, ["b"])).toBeUndefined();
  });

  it("uses the text of the gate that unlocked last", () => {
    expect(banner({ a: "unlockedDuringVisit", b: "unlockedDuringVisit" }, ["b", "a"])).toEqual({ state: "unlocked", text: "a unlocked" });
  });

  it("shows nothing while a gate is awaiting a restored unlock", () => {
    expect(banner({ a: "awaitingRestore", b: "unlockedDuringVisit" }, ["b"])).toBeUndefined();
  });

  it("shows nothing when every gate is open", () => {
    expect(banner({ a: "open", b: "open" })).toBeUndefined();
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

  it("locks the whole other column of a split section and what is below the gate in its own", () => {
    const rightPinned = section([question("model", "primary"), question("qA", "secondary"), question("qB", "secondary")], "40-60");
    expect(plan(page(rightPinned), gate("model"))).toEqual({ model: ["qA", "qB"] });

    const aboveInOwnColumn = section([question("qTop", "primary"), question("model", "primary"), question("qA", "secondary")], "40-60");
    expect(plan(page(aboveInOwnColumn), gate("model"))).toEqual({ model: ["qA"] });

    const sixtyForty = section([question("qA", "secondary"), question("model", "primary"), question("qB", "primary")], "60-40");
    expect(plan(page(sixtyForty), gate("model"))).toEqual({ model: ["qB", "qA"] });
  });

  it("never lets gates in different columns of one section disable each other", () => {
    const sideBySide = section([
      question("gateL", "secondary"), question("qL", "secondary"), question("gateR", "primary"), question("qR", "primary")
    ], "40-60");
    expect(plan(page(sideBySide), gate("gateL", "gateR"))).toEqual({ gateL: ["qL", "qR"], gateR: ["qL", "qR"] });
  });

  it("uses authored order when a split section is stacked in a single-page activity", () => {
    const fortySixty = section([question("qA", "secondary"), question("model", "primary"), question("qB", "secondary")], "40-60");
    expect(plan(page(fortySixty), gate("model"), ActivityLayouts.SinglePage)).toEqual({ model: ["qB"] });
  });

  it("ignores gating ids that are missing, hidden, or save no state", () => {
    const p = page(section([{ ...embed("hidden", true), is_hidden: true }, text("text"), embed("noState"), question("q1")]));
    expect(plan(p, gate("missing"))).toEqual({});
    expect(plan(p, gate("hidden"))).toEqual({});
    expect(plan(p, gate("text"))).toEqual({});
    expect(plan(p, gate("noState"))).toEqual({});
  });

  it("stops at the end of the gating item's section for disable_following_in_section", () => {
    const p = page(section([question("q0"), embed("model", true), question("q1"), text("t"), question("q2")]), section([question("q3")]));
    expect(plan(p, { model: "disable_following_in_section" })).toEqual({ model: ["q1", "q2"] });
    expect(plan(p, { model: "disable_following_on_page" })).toEqual({ model: ["q1", "q2", "q3"] });
  });

  it("locks the other column but not later sections for disable_following_in_section", () => {
    const fortySixty = section([question("model", "primary"), question("qA", "secondary"), question("qB", "primary")], "40-60");
    const p = page(fortySixty, section([question("later")]));
    expect(plan(p, { model: "disable_following_in_section" })).toEqual({ model: ["qA", "qB"] });
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

  it("gives a section-limited gate no tab banners", () => {
    const p = page(section([embed("m", true), question("q1")]), section([question("q2")]));
    const tabs = planTabBanners(p, plan(p, { m: "disable_following_in_section" }, ActivityLayouts.Notebook));
    expect(tabs).toEqual({ m: [] });
  });

  it("joins a gating item to the banner already covering its first question's tab", () => {
    const p = page(section([embed("a", true), question("q1")]), section([embed("b", true), question("q2")]), section([question("q3")]));
    expect(tabsOf(p, gate("a", "b"))).toEqual({ a: [2, 3], b: [2, 3] });
  });
});

describe("nextGateStatus", () => {
  const declared = (hasState: boolean): GateEvent => ({ type: "declared", hasState });
  const unlocked = (restored: boolean): GateEvent => ({ type: "unlocked", restored });
  const restoreWindowEnded: GateEvent = { type: "restoreWindowEnded" };
  const declarationWindowEnded: GateEvent = { type: "declarationWindowEnded" };

  it.each<[GateStatus, GateEvent, GateStatus]>([
    ["loading", declared(false), "locked"],
    ["loading", declared(true), "awaitingRestore"],
    ["loading", restoreWindowEnded, "loading"],
    ["loading", declarationWindowEnded, "open"],
    ["loading", unlocked(true), "open"],
    ["loading", unlocked(false), "open"],
    ["awaitingRestore", declared(false), "awaitingRestore"],
    ["awaitingRestore", restoreWindowEnded, "locked"],
    ["awaitingRestore", declarationWindowEnded, "awaitingRestore"],
    ["awaitingRestore", unlocked(true), "open"],
    ["awaitingRestore", unlocked(false), "open"],
    ["locked", declared(true), "locked"],
    ["locked", restoreWindowEnded, "locked"],
    ["locked", declarationWindowEnded, "locked"],
    ["locked", unlocked(true), "open"],
    ["locked", unlocked(false), "unlockedDuringVisit"],
    ...(["open", "unlockedDuringVisit"] as GateStatus[]).flatMap(status =>
      [declared(false), declared(true), restoreWindowEnded, declarationWindowEnded, unlocked(true), unlocked(false)]
        .map((event): [GateStatus, GateEvent, GateStatus] => [status, event, status]))
  ])("moves %s on %j to %s", (status, event, expected) => {
    expect(nextGateStatus(status, event)).toBe(expected);
  });
});

describe("applyGateEvent", () => {
  const empty: IGateState = { statuses: {}, unlockOrder: [] };
  const unlock: GateEvent = { type: "unlocked", restored: false };

  it("returns the same state when the event changes nothing", () => {
    const unchanged = applyGateEvent(empty, "a", { type: "restoreWindowEnded" });
    expect(unchanged).toBe(empty);
  });

  it("records each gate's unlock during the visit once, in order", () => {
    const locked = ["a", "b"].reduce((state, refId) => applyGateEvent(state, refId, { type: "declared", hasState: false }), empty);
    expect(locked).toEqual({ statuses: { a: "locked", b: "locked" }, unlockOrder: [] });
    const unlockedB = applyGateEvent(locked, "b", unlock);
    const unlockedBoth = applyGateEvent(applyGateEvent(unlockedB, "a", unlock), "b", unlock);
    expect(unlockedBoth).toEqual({ statuses: { a: "unlockedDuringVisit", b: "unlockedDuringVisit" }, unlockOrder: ["b", "a"] });
  });

  it("records no unlock for a gate that opens", () => {
    const opened = applyGateEvent(empty, "a", { type: "unlocked", restored: true });
    expect(opened).toEqual({ statuses: { a: "open" }, unlockOrder: [] });
  });
});

describe("the sample-disabled-questions activity", () => {
  const activity = sampleActivities["sample-disabled-questions"];
  const allModels = {
    ...gate("9101-MwInteractive", "9102-MwInteractive", "9103-MwInteractive", "9104-MwInteractive", "9105-MwInteractive"),
    "9116-MwInteractive": "disable_following_in_section" as const
  };
  const planPage = (position: number) =>
    planDisabledQuestions(activity.pages[position - 1], activity.layout, allModels);

  it("locks both questions after the full-width model", () => {
    expect(planPage(1)).toEqual({ "9101-MwInteractive": ["9106-ManagedInteractive", "9107-ManagedInteractive"] });
  });

  it("locks the questions in both columns when the model is on the left", () => {
    expect(planPage(2)).toEqual({ "9102-MwInteractive": ["9108-ManagedInteractive", "9109-ManagedInteractive", "9110-ManagedInteractive"] });
  });

  it("locks every left-column question when the model is pinned on the right", () => {
    expect(planPage(3)).toEqual({ "9103-MwInteractive": [
      "9111-ManagedInteractive", "9112-ManagedInteractive", "9125-ManagedInteractive", "9126-ManagedInteractive", "9113-ManagedInteractive"
    ] });
  });

  it("makes the last question wait for both models", () => {
    expect(planPage(4)).toEqual({
      "9104-MwInteractive": ["9114-ManagedInteractive", "9105-MwInteractive", "9115-ManagedInteractive"],
      "9105-MwInteractive": ["9115-ManagedInteractive"]
    });
  });

  it("locks only the questions in the model's own section when limited to it", () => {
    expect(planPage(5)).toEqual({ "9116-MwInteractive": ["9117-ManagedInteractive", "9118-ManagedInteractive"] });
  });

  it("repeats no ref_id on a page", () => {
    expect(activity.pages).toHaveLength(5);
    activity.pages.forEach(p => {
      const refIds = p.sections.flatMap(s => s.embeddables.map(e => e.ref_id));
      expect(new Set(refIds).size).toBe(refIds.length);
    });
  });
});

