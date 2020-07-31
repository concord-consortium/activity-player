import { Page, Activity, EmbeddableWrapper } from "../types";

export enum ActivityLayouts {
  MultiplePages = 0,
  SinglePage = 1,
}

export enum PageLayouts {
  FullWidth = "l-full-width",
  Responsive = "l-responsive",
  SixtyForty = "l-6040",
  FortySixty = "r-4060",
}

export enum EmbeddableSections {
  Interactive = "interactive_box",
  Introduction = "header_block",
  InfoAssessment = "", // stored as null in JSON
}

export interface VisibleEmbeddables {
  interactiveBox: EmbeddableWrapper[],
  headerBlock: EmbeddableWrapper[],
  infoAssessment: EmbeddableWrapper[],
}

export const isQuestion = (embeddableWrapper: EmbeddableWrapper) => {
  return ((embeddableWrapper.embeddable.type === "ManagedInteractive" && embeddableWrapper.embeddable.library_interactive?.data?.enable_learner_state)
          || (embeddableWrapper.embeddable.type === "MwInteractive" && embeddableWrapper.embeddable.enable_learner_state));
};

export interface PageSectionQuestionCount {
  Header: number;
  InfoAssessment: number;
  InteractiveBlock: number;
}

export const isEmbeddableSectionHidden = (page: Page, section: string | null) => {
  const isSectionHidden = ((section === EmbeddableSections.Introduction && !page.show_header)
    || (section === EmbeddableSections.Interactive && !page.show_interactive)
    || (!section && !page.show_info_assessment));
  return isSectionHidden;
};

export const getVisibleEmbeddablesOnPage = (page: Page) => {
  const headerEmbeddables = isEmbeddableSectionHidden(page, EmbeddableSections.Introduction)
    ? []
    : page.embeddables.filter((e: any) => e.section === EmbeddableSections.Introduction && !e.embeddable.is_hidden);
  const interactiveEmbeddables = isEmbeddableSectionHidden(page, EmbeddableSections.Interactive)
    ? []
    : page.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive && !e.embeddable.is_hidden);
  const infoAssessEmbeddables = isEmbeddableSectionHidden(page, null)
    ? []
    : page.embeddables.filter((e: any) => (e.section !== EmbeddableSections.Interactive && e.section !== EmbeddableSections.Introduction && !e.embeddable.is_hidden));

  return { interactiveBox: interactiveEmbeddables, headerBlock: headerEmbeddables, infoAssessment: infoAssessEmbeddables };
};

export const getPageSectionQuestionCount = (page: Page) => {
  const pageSectionQuestionCount: PageSectionQuestionCount = { Header: 0, InfoAssessment: 0, InteractiveBlock: 0 };
  for (let embeddableNum = 0; embeddableNum < page.embeddables.length; embeddableNum++) {
    const embeddableWrapper = page.embeddables[embeddableNum];
    if (isQuestion(embeddableWrapper) && !embeddableWrapper.embeddable.is_hidden) {
      if (embeddableWrapper.section === EmbeddableSections.Introduction && !isEmbeddableSectionHidden(page, embeddableWrapper.section)) {
        pageSectionQuestionCount.Header++;
      } else if (!embeddableWrapper.section && !isEmbeddableSectionHidden(page, embeddableWrapper.section)) {
        pageSectionQuestionCount.InfoAssessment++;
      } else if (embeddableWrapper.section === EmbeddableSections.Interactive && !isEmbeddableSectionHidden(page, embeddableWrapper.section)) {
        pageSectionQuestionCount.InteractiveBlock++;
      }
    }
  }
  return pageSectionQuestionCount;
};

export const numQuestionsOnPreviousPages = (currentPage: number, activity: Activity) => {
  let numQuestions = 0;
  for (let page = 0; page < currentPage - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddableWrapper = activity.pages[page].embeddables[embeddableNum];
        if (isQuestion(embeddableWrapper) && !embeddableWrapper.embeddable.is_hidden && !isEmbeddableSectionHidden(activity.pages[page], embeddableWrapper.section)) {
          numQuestions++;
        }
      }
    }
  }
  return numQuestions;
};

export const enableReportButton = (activity: Activity) => {
  const hasCompletionPage = activity.pages.find((page: any) => page.is_completion);
  return !hasCompletionPage && activity.student_report_enabled;
};
