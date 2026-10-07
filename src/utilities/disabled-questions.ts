import { EmbeddableType, Page, SectionType } from "../types";
import { getVisibleSections, isQuestion } from "./page-walk";
import { getSectionColumns } from "./section-columns";

export const kDisableQuestionsAfterParam = "override:disableQuestionsAfter";

/** Gating item ref_id to the ref_ids of the questions it disables, in page order. */
export type DisabledQuestionsPlan = Record<string, string[]>;

/** The values of LARA's per-item `question_gating` setting that this Activity Player acts on. */
export type QuestionGating = "none" | "disable_following_on_page" | "disable_following_in_section";

/** Item ref_id to its `question_gating` value. */
export type QuestionGatingSettings = Record<string, QuestionGating>;

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
 * in the other column, since columns sit side by side and their relative heights change as the page reflows.
 * `"disable_following_on_page"` also disables every question in the page's later sections.
 */
export const planDisabledQuestions = (page: Page, activityLayout: number, settings: QuestionGatingSettings): DisabledQuestionsPlan => {
  const plan: DisabledQuestionsPlan = {};
  if (Object.keys(settings).length === 0) return plan;
  const items = pageItems(page, activityLayout);
  items.forEach((gate, gateIndex) => {
    const gating = settings[gate.embeddable.ref_id];
    if ((gating !== "disable_following_on_page" && gating !== "disable_following_in_section") || !savesLearnerState(gate.embeddable)) return;
    const reaches = (item: IPlannedItem, index: number) => item.sectionIndex === gate.sectionIndex
      ? index !== gateIndex && (item.column !== gate.column || index > gateIndex)
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

export type GateStatus = "loading" | "locked" | "unlockedOnLoad" | "unlockedDuringVisit";

/** Applies one saved-state report for a gating item. Unlocking is one way within a visit. */
export const nextGateStatus = (status: GateStatus, hasSavedState: boolean): GateStatus => {
  if (status === "unlockedOnLoad" || status === "unlockedDuringVisit") return status;
  if (hasSavedState) return status === "loading" ? "unlockedOnLoad" : "unlockedDuringVisit";
  return "locked";
};
