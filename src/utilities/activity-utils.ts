import { Page, Activity, EmbeddableType, Sequence, SectionType } from "../types";
import { SidebarConfiguration } from "../components/page-sidebar/sidebar-wrapper";
import { isQuestion as isEmbeddableQuestion } from "./embeddable-utils";

export enum ActivityLayouts {
  MultiplePages = 0,
  SinglePage = 1,
}

export enum SectionLayouts {
  FullWidth = "l-full-width",
  Responsive = "l-responsive",
  SixtyForty = "l-6040",
  FortySixty = "r-4060",
}

// export enum EmbeddableSections {
//   Interactive = "interactive_box",
//   Introduction = "header_block",
//   InfoAssessment = "", // stored as null in JSON
// }

// export interface VisibleEmbeddables {
//   interactiveBox: EmbeddableWrapper[],
//   headerBlock: EmbeddableWrapper[],
//   infoAssessment: EmbeddableWrapper[],
// }

export const isQuestion = (embeddable: EmbeddableType) => isEmbeddableQuestion(embeddable);

export interface PageSectionQuestionCount {
  Header: number;
  InfoAssessment: number;
  InteractiveBlock: number;
}

export const isSectionHidden = (section: SectionType) => {
  return section.is_hidden;
};

// export const getVisibleEmbeddablesOnPage = (page: Page) => {
//   const headerEmbeddables = isEmbeddableSectionHidden(page, EmbeddableSections.Introduction)
//     ? []
//     : page.sections.embeddables.filter((e: any) => e.section === EmbeddableSections.Introduction && isVisibleEmbeddable(e));
//   const interactiveEmbeddables = isEmbeddableSectionHidden(page, EmbeddableSections.Interactive)
//     ? []
//     : page.sections.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive && isVisibleEmbeddable(e));
//   const infoAssessEmbeddables = isEmbeddableSectionHidden(page, null)
//     ? []
//     : page.sections.embeddables.filter((e: any) => (e.section !== EmbeddableSections.Interactive && e.section !== EmbeddableSections.Introduction && isVisibleEmbeddable(e)));

//   return { interactiveBox: interactiveEmbeddables, headerBlock: headerEmbeddables, infoAssessment: infoAssessEmbeddables };
// };

// function isVisibleEmbeddable(e: EmbeddableType) {
//   return !embeddable.is_hidden && !e.embeddable.embeddable_ref_id && !isEmbeddableSideTip(e);
// }

export const isEmbeddableSideTip = (e: EmbeddableType) => {
  return (e.type === "Embeddable::EmbeddablePlugin" && e.plugin?.component_label === "sideTip");
};

export const getPageSideTipEmbeddables = (activity: Activity, currentPage: Page) => {
  if (activity.layout === ActivityLayouts.SinglePage) {
    const sidetips: EmbeddableType[] = [];
    for (let page = 0; page < activity.pages.length - 1; page++) {
      for (let section = 0; section < activity.pages[page].sections.length; section ++) {
        for (let embeddableNum = 0; embeddableNum < activity.pages[page].sections[section].embeddables.length; embeddableNum++) {
          const embeddableWrapper = activity.pages[page].sections[section].embeddables[embeddableNum];
          if (isEmbeddableSideTip(embeddableWrapper)) {
            sidetips.push(embeddableWrapper);
          }
        }
      }
    }
    return sidetips || [];
  }
  // else {
  //   return currentPage.sections.embeddables.filter((e: any) => isEmbeddableSideTip(e));
  // }
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
  const sections = page.sections;
  let pageQuestionCount = 0;
  sections.forEach((section)=>{
    let sectionQuestionCount = 0;
    section.embeddables.forEach((embeddable) => {
      isQuestion(embeddable) && sectionQuestionCount++;
    });
    pageQuestionCount = pageQuestionCount + sectionQuestionCount;
  });
  return pageQuestionCount;
};

export const numQuestionsOnPreviousSections = (currentSectionIndex: number, sections: SectionType[]) => {
  let numQuestions = 0;
  console.log("currentSectionIndex: ", currentSectionIndex);
  for (let sectionIdx = 0; sectionIdx < currentSectionIndex; sectionIdx++) {
    sections[sectionIdx].embeddables.forEach((embeddable) => {
      console.log(embeddable);
      console.log(isQuestion(embeddable));
      if (isQuestion(embeddable)) {
        numQuestions++;
        console.log("isQuestion: ", numQuestions);
      }
    });
    console.log("in numQuestionsOnPreviousSections: ", numQuestions);
  }
  return numQuestions;
};

export const numQuestionsOnPreviousPages = (currentPage: number, activity: Activity) => {
  let numQuestions = 0;
  for (let page = 0; page < currentPage - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let section = 0; section < activity.pages[page].sections.length; section++) {
        if(!activity.pages[page].sections[section].is_hidden) {
          for (let embeddableNum = 0; embeddableNum < activity.pages[page].sections[section].embeddables.length; embeddableNum++) {
            const embeddableWrapper = activity.pages[page].sections[section].embeddables[embeddableNum];
            if (isQuestion(embeddableWrapper) && !embeddableWrapper.is_hidden) {
              numQuestions++;
            }
          }
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

export const getLinkedPluginEmbeddable = (section: SectionType, id: string) => {
  const linkedPluginEmbeddable = section.embeddables.find((e: EmbeddableType) => e.embeddable_ref_id === id);
  return linkedPluginEmbeddable?.type === "Embeddable::EmbeddablePlugin" ? linkedPluginEmbeddable : undefined;
};

export const setAppBackgroundImage = (backgroundImageUrl?: string) => {
  const gradient = "linear-gradient(to bottom, #fff, rgba(255,255,255,0), rgba(255,255,255,0))";
  const el = document.querySelector("#app") as HTMLElement;
  el?.style.setProperty("background-image", `url(${backgroundImageUrl})` || gradient);
  el?.style.setProperty("background-size", "cover");
  el?.style.setProperty("background-repeat", "no-repeat");
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

export const getSequenceActivityFromQueryValue = (sequence: Sequence, sequenceActivityQueryValue = "0"): number => {
  const activityId = sequenceActivityQueryValue.startsWith("activity_") ? parseInt(sequenceActivityQueryValue.split("_")[1], 10) : NaN;

  if (!isNaN(activityId)) {
    for (const activity of sequence.activities) {
      if (activity.id === activityId) {
        // add 1 to the index value because we start counting sequence activities with 1
        return sequence.activities.indexOf(activity) + 1;
      }
    }

    // default to index page when id not found
    return 0;
  }

  // activity should be in the range [0, <number of activities>].
  return Math.max(0, Math.min((parseInt(sequenceActivityQueryValue, 10) || 0), sequence.activities.length));
};

export const getSequenceActivityId = (sequence: Sequence, activityIndex: number | undefined): string | undefined => {
  if (activityIndex !== undefined) {
    for (const activity of sequence.activities) {
      if (sequence.activities.indexOf(activity) === activityIndex && activity.id !== undefined) {
        return `activity_${activity.id}`;
      }
    }
  }

  return undefined;
};
