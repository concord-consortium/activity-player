import { Page, Activity, EmbeddableWrapper } from "../types";
import { SidebarConfiguration } from "../components/page-sidebar/sidebar-wrapper";
import { isQuestion as isEmbeddableQuestion } from "./embeddable-utils";

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

export const isQuestion = (embeddableWrapper: EmbeddableWrapper) => isEmbeddableQuestion(embeddableWrapper.embeddable);

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
    : page.embeddables.filter((e: any) => e.section === EmbeddableSections.Introduction && isVisibleEmbeddable(e));
  const interactiveEmbeddables = isEmbeddableSectionHidden(page, EmbeddableSections.Interactive)
    ? []
    : page.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive && isVisibleEmbeddable(e));
  const infoAssessEmbeddables = isEmbeddableSectionHidden(page, null)
    ? []
    : page.embeddables.filter((e: any) => (e.section !== EmbeddableSections.Interactive && e.section !== EmbeddableSections.Introduction && isVisibleEmbeddable(e)));

  return { interactiveBox: interactiveEmbeddables, headerBlock: headerEmbeddables, infoAssessment: infoAssessEmbeddables };
};

function isVisibleEmbeddable(e: EmbeddableWrapper) {
  return !e.embeddable.is_hidden && !e.embeddable.embeddable_ref_id && !isEmbeddableSideTip(e);
}

export const isEmbeddableSideTip = (e: EmbeddableWrapper) => {
  return (e.embeddable.type === "Embeddable::EmbeddablePlugin" && e.embeddable.plugin?.component_label === "sideTip");
};

export const getPageSideTipEmbeddables = (activity: Activity, currentPage: Page) => {
  if (activity.layout === ActivityLayouts.SinglePage) {
    const sidetips: EmbeddableWrapper[] = [];
    for (let page = 0; page < activity.pages.length - 1; page++) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddableWrapper = activity.pages[page].embeddables[embeddableNum];
        if (isEmbeddableSideTip(embeddableWrapper)) {
          sidetips.push(embeddableWrapper);
        }
      }
    }
    return sidetips;
  } else {
    return currentPage.embeddables.filter((e: any) => isEmbeddableSideTip(e));
  }
};

export const getPageSideBars = (activity: Activity, currentPage: Page) => {
  const sidebars: SidebarConfiguration[] = activity.layout === ActivityLayouts.SinglePage
    ? activity.pages.filter((page) => page.show_sidebar).map((page) => (
        {content: page.sidebar, title: page.sidebar_title }
      ))
    : currentPage.show_sidebar? [{ content: currentPage.sidebar, title: currentPage.sidebar_title }]: [];
  return sidebars;
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

export const getLinkedPluginEmbeddable = (page: Page, id: string) => {
  const linkedPluginEmbeddable = page.embeddables.find((e: EmbeddableWrapper) => e.embeddable.embeddable_ref_id === id);
  return linkedPluginEmbeddable?.embeddable.type === "Embeddable::EmbeddablePlugin" ? linkedPluginEmbeddable.embeddable : undefined;
};

export const setAppBackgroundImage = (backgroundImageUrl?: string) => {
  const gradient = "linear-gradient(to bottom, #fff, rgba(255,255,255,0), rgba(255,255,255,0))";
  const el = document.querySelector(".app") as HTMLElement;
  el?.style.setProperty("background-image", backgroundImageUrl || gradient);
};

export const setDocumentTitle = (activity: Activity | undefined, pageNumber: number) => {
  if (activity) {
    document.title = pageNumber === 0
      ? activity.name
      : `Page ${pageNumber} ${activity.pages[pageNumber - 1].name || activity.name}`;
  }
};

export const getPagePositionFromQueryValue = (activity: Activity, pageQueryValue = "0"): number => {
  const pageId = pageQueryValue.startsWith("page_") ? parseInt(pageQueryValue.split("_")[1], 10) : NaN;

  if (!isNaN(pageId)) {
    for (const page of activity.pages) {
      if (page.id === pageId) {
        return page.position;
      }
    }

    // default to index page when id not found
    return 0;
  }

  // page should be in the range [0, <number of pages>].
  // note that page is 1 based for the actual pages in the activity.
  return Math.max(0, Math.min((parseInt(pageQueryValue, 10) || 0), activity.pages.length));
};
