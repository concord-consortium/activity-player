import { EmbeddableType, IManagedInteractive, IMwInteractive, Page, SectionType } from "../types";
import { getVisibleSections, isQuestion } from "./page-walk";
import { getSectionColumns } from "./section-columns";

export const kDisableQuestionsAfterParam = "override:disableQuestionsAfter";

/** Gating item ref_id to the ref_ids of the questions it disables, in page order. */
export type DisabledQuestionsPlan = Record<string, string[]>;

/** The values of LARA's per-item `question_gating` setting that this Activity Player acts on. */
export type QuestionGating = "none" | "disable_following_on_page" | "disable_following_in_section";

/** Item ref_id to its `question_gating` value. */
export type QuestionGatingSettings = Record<string, QuestionGating>;

export const defaultLockedBannerText = (name: string | null | undefined) =>
  name?.trim() ? `Use ${name.trim()} to unlock these questions.` : "Use the interactive to unlock these questions.";
export const kDefaultUnlockedBannerText = "The questions are now unlocked!";

const kQuestionGatingValues: QuestionGating[] = ["none", "disable_following_on_page", "disable_following_in_section"];

/** A missing, null or unknown value means "none". */
export const toQuestionGating = (value: unknown): QuestionGating =>
  kQuestionGatingValues.includes(value as QuestionGating) ? value as QuestionGating : "none";

// Interactives that save learner state, whether or not their question number is shown.
const savesLearnerState = (embeddable: EmbeddableType) => isQuestion(embeddable, { ignoreHideQuestionNumber: true });

const kSectionSuffix = ":section";

/**
 * The URL parameter sets `question_gating` on each item it names: `"disable_following_on_page"`, or
 * `"disable_following_in_section"` for a ref_id ending in `:section`.
 */
export const parseQuestionGatingParam = (value: string | undefined): QuestionGatingSettings => {
  const entries = (value ?? "").split(",").map(entry => entry.trim()).filter(entry => entry.length > 0);
  return Object.fromEntries(entries.map(entry => entry.endsWith(kSectionSuffix)
    ? [entry.slice(0, -kSectionSuffix.length), "disable_following_in_section" as QuestionGating]
    : [entry, "disable_following_on_page" as QuestionGating]
  ));
};

const interactives = (page: Page) => page.sections.flatMap(section => section.embeddables)
  .filter((e): e is IMwInteractive | IManagedInteractive => e.type === "MwInteractive" || e.type === "ManagedInteractive");

export const authoredQuestionGating = (page: Page): QuestionGatingSettings => Object.fromEntries(
  interactives(page)
    .map(e => [e.ref_id, toQuestionGating(e.question_gating)] as const)
    .filter(([, gating]) => gating !== "none")
);

/** The authored settings, with the override parameter's values replacing them for the items it names. */
export const questionGatingSettings = (page: Page, overrideParam: string | undefined): QuestionGatingSettings =>
  ({ ...authoredQuestionGating(page), ...parseQuestionGatingParam(overrideParam) });

export interface IGateTexts { locked: string; unlocked: string; }

const authoredText = (text: string | null | undefined, fallback: string) => text?.trim() || fallback;

export const gateTexts = (page: Page): Record<string, IGateTexts> => Object.fromEntries(interactives(page).map(e => [e.ref_id, {
  locked: authoredText(e.question_gating_locked_text, defaultLockedBannerText(e.name)),
  unlocked: authoredText(e.question_gating_unlocked_text, kDefaultUnlockedBannerText)
}]));

export interface IBanner { state: "locked" | "unlocked"; text: string; }

interface IPlannedItem {
  embeddable: EmbeddableType;
  sectionIndex: number;
  column: "stacked" | "left" | "right";
}

// A page's visible embeddables in question-numbering order, each with its section and column.
const pageItems = (page: Page, activityLayout: number): IPlannedItem[] =>
  getVisibleSections(page).flatMap((section, sectionIndex) => {
    const { stacked, left, right } = getSectionColumns(section, activityLayout);
    const columns: Array<[IPlannedItem["column"], EmbeddableType[]]> =
      stacked ? [["stacked", section.embeddables]] : [["left", left], ["right", right]];
    return columns.flatMap(([column, embeddables]) => embeddables
      .filter(embeddable => !embeddable.is_hidden)
      .map(embeddable => ({ embeddable, sectionIndex, column })));
  });

/**
 * A gating item disables the questions below it in its own column and, in a split section, every question
 * in the other column except another gating item, since columns sit side by side and their relative heights
 * change as the page reflows. `"disable_following_on_page"` also disables every question in later sections.
 */
export const planDisabledQuestions = (page: Page, activityLayout: number, settings: QuestionGatingSettings): DisabledQuestionsPlan => {
  const plan: DisabledQuestionsPlan = {};
  if (Object.keys(settings).length === 0) return plan;
  const items = pageItems(page, activityLayout);
  const isGate = ({ embeddable }: IPlannedItem) => {
    const gating = settings[embeddable.ref_id];
    return (gating === "disable_following_on_page" || gating === "disable_following_in_section") && savesLearnerState(embeddable);
  };
  items.forEach((gate, gateIndex) => {
    if (!isGate(gate)) return;
    const gating = settings[gate.embeddable.ref_id];
    // Two gates side by side would otherwise disable each other, and neither could ever be used to unlock.
    const reaches = (item: IPlannedItem, index: number) => item.sectionIndex === gate.sectionIndex
      ? index !== gateIndex && (item.column !== gate.column ? !isGate(item) : index > gateIndex)
      : item.sectionIndex > gate.sectionIndex && gating === "disable_following_on_page";
    plan[gate.embeddable.ref_id] = items
      .filter(reaches)
      .map(item => item.embeddable)
      .filter(savesLearnerState)
      .map(e => e.ref_id);
  });
  return plan;
};

/**
 * For the notebook layout, where only one tab shows at a time: each gating item to the tabs after its own
 * (visible sections) that hold a question it disables. Each of those tabs shows the banner under the tabs.
 * A gating item whose first disabled question is in a tab that already shows that banner joins it there.
 */
export const planTabBanners = (page: Page, plan: DisabledQuestionsPlan): Record<string, SectionType[]> => {
  const sections = getVisibleSections(page);
  const sectionIndexOf = (refId: string) => sections.findIndex(s => s.embeddables.some(e => e.ref_id === refId));
  const tabs: Record<string, SectionType[]> = {};
  Object.entries(plan).forEach(([gatingRefId, questionRefIds]) => {
    const gatingIndex = sectionIndexOf(gatingRefId);
    const reached = new Set(questionRefIds.map(sectionIndexOf).filter(index => index > gatingIndex));
    tabs[gatingRefId] = sections.filter((_, index) => reached.has(index));
  });
  const covered = new Set(Object.values(tabs).flat());
  Object.entries(plan).forEach(([gatingRefId, questionRefIds]) => {
    const firstTab = sections[sectionIndexOf(questionRefIds[0])];
    if (firstTab && covered.has(firstTab) && !tabs[gatingRefId].includes(firstTab)) {
      tabs[gatingRefId] = [firstTab, ...tabs[gatingRefId]];
    }
  });
  return tabs;
};

/** "loading" and "awaitingRestore" both show as disabled but not grayed, with no banner. */
export type GateStatus = "loading" | "awaitingRestore" | "locked" | "unlockedDuringVisit" | "open";

export type GateEvent =
  | { type: "declared"; hasState: boolean }
  | { type: "restoreWindowEnded" }
  | { type: "declarationWindowEnded" }
  | { type: "unlocked"; restored: boolean };

export const isSettling = (status: GateStatus) => status === "loading" || status === "awaitingRestore";

/** Unlocking is one way within a visit, and a gate never returns to loading. */
export const nextGateStatus = (status: GateStatus, event: GateEvent): GateStatus => {
  if (status === "open" || status === "unlockedDuringVisit") return status;
  switch (event.type) {
    case "declared":
      return status === "loading" ? (event.hasState ? "awaitingRestore" : "locked") : status;
    case "restoreWindowEnded":
      return status === "awaitingRestore" ? "locked" : status;
    case "declarationWindowEnded":
      return status === "loading" ? "open" : status;
    case "unlocked":
      // The unlocked banner announces a change the student saw, so only a locked gate shows it.
      return status === "locked" && !event.restored ? "unlockedDuringVisit" : "open";
  }
};

export interface IGateState { statuses: Record<string, GateStatus>; unlockOrder: string[]; }

/** Returns the same state when the event changes nothing, so repeated messages do not re-render. */
export const applyGateEvent = (state: IGateState, refId: string, event: GateEvent): IGateState => {
  const status = state.statuses[refId] ?? "loading";
  const next = nextGateStatus(status, event);
  if (next === status) return state;
  return {
    statuses: { ...state.statuses, [refId]: next },
    unlockOrder: next === "unlockedDuringVisit" ? [...state.unlockOrder, refId] : state.unlockOrder
  };
};

/**
 * The banner that speaks for several gates, given in page order: locked while any is locked, with the first
 * locked gate's text; unlocked once none is locked or loading and one unlocked during the visit, with the text
 * of the gate that unlocked last; otherwise none.
 */
export const combineBanner = (
  gateRefIds: string[], statusOf: (refId: string) => GateStatus, unlockOrder: string[], textsOf: (refId: string) => IGateTexts
): IBanner | undefined => {
  const lockedGate = gateRefIds.find(refId => statusOf(refId) === "locked");
  if (lockedGate) return { state: "locked", text: textsOf(lockedGate).locked };
  if (gateRefIds.some(refId => isSettling(statusOf(refId)))) return undefined;
  const lastUnlocked = [...unlockOrder].reverse().find(refId => gateRefIds.includes(refId));
  return lastUnlocked ? { state: "unlocked", text: textsOf(lastUnlocked).unlocked } : undefined;
};
