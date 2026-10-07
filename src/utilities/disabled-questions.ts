import { EmbeddableType, Page, SectionType } from "../types";
import { getVisibleSections, isQuestion } from "./page-walk";
import { embeddablesInNumberingOrder } from "./section-columns";

export const kDisableQuestionsAfterParam = "override:disableQuestionsAfter";

/** Gating item ref_id to the ref_ids of the questions it disables, in page order. */
export type DisabledQuestionsPlan = Record<string, string[]>;

/** The values of LARA's per-item `question_gating` setting that this Activity Player acts on. */
export type QuestionGating = "none" | "disable_following_on_page";

/** Item ref_id to its `question_gating` value. */
export type QuestionGatingSettings = Record<string, QuestionGating>;

// Interactives that save learner state, whether or not their question number is shown.
const savesLearnerState = (embeddable: EmbeddableType) => isQuestion(embeddable, { ignoreHideQuestionNumber: true });

/** The URL parameter sets `question_gating: "disable_following_on_page"` on each item it names. */
export const parseQuestionGatingParam = (value: string | undefined): QuestionGatingSettings => {
  const refIds = (value ?? "").split(",").map(refId => refId.trim()).filter(refId => refId.length > 0);
  return Object.fromEntries(refIds.map(refId => [refId, "disable_following_on_page" as QuestionGating]));
};

export const planDisabledQuestions = (page: Page, activityLayout: number, settings: QuestionGatingSettings): DisabledQuestionsPlan => {
  const plan: DisabledQuestionsPlan = {};
  if (Object.keys(settings).length === 0) return plan;
  const embeddables = getVisibleSections(page)
    .flatMap(section => embeddablesInNumberingOrder(section, activityLayout))
    .filter(embeddable => !embeddable.is_hidden);
  embeddables.forEach((embeddable, index) => {
    if (settings[embeddable.ref_id] !== "disable_following_on_page" || !savesLearnerState(embeddable)) return;
    plan[embeddable.ref_id] = embeddables.slice(index + 1).filter(savesLearnerState).map(e => e.ref_id);
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
