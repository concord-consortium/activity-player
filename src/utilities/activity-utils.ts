import { Page, Activity, EmbeddableType, Sequence, SectionType } from "../types";
import { SidebarConfiguration } from "../components/page-sidebar/sidebar-wrapper";
import { answerHasResponse, isQuestion as isEmbeddableQuestion, refIdToAnswersQuestionId } from "./embeddable-utils";
import { queryValue } from "./url-query";
import { WrappedDBAnswer } from "../firebase-db";

export enum ActivityLayouts {
  MultiplePages = 0,
  SinglePage = 1,
  Notebook = 2,
}
export enum ActivityLayoutOverrides {
  MultiplePages = ActivityLayouts.MultiplePages + 1,
  SinglePage = ActivityLayouts.SinglePage + 1,
  Notebook = ActivityLayouts.Notebook + 1,
}

export enum SectionLayouts {
  FullWidth = "l-full-width",
  Responsive = "l-responsive",
  SixtyForty = "l-6040",
  FortySixty = "r-4060",
  SeventyThirty = "l-7030",
  ThirtySeventy = "r-3070"
}

export const isQuestion = (embeddable: EmbeddableType) => isEmbeddableQuestion(embeddable);

export interface PageSectionQuestionCount {
  Header: number;
  InfoAssessment: number;
  InteractiveBlock: number;
}

interface ISetDocumentTitleParams {
  activity: Activity | undefined;
  pageNumber: number;
  sequence?: Sequence;
  sequenceActivityNum?: number;
}

export const isSectionHidden = (section: SectionType) => {
  return section.is_hidden;
};

export const isEmbeddableSideTip = (e: EmbeddableType) => {
  return (e.type === "Embeddable::EmbeddablePlugin" && e.plugin?.component_label === "sideTip");
};

export const isNotVisibleEmbeddable =(e: EmbeddableType) => {
  return e.is_hidden || e.embeddable_ref_id || isEmbeddableSideTip;
};

export const getPageSideTipEmbeddables = (activity: Activity, currentPage: Page) => {
  if (activity.layout === ActivityLayouts.SinglePage) {
    const sidetips: EmbeddableType[] = [];
    activity.pages.forEach ((page) => {
      page.sections.forEach((section) => {
        section.embeddables.forEach((embeddable) => {
          if (isEmbeddableSideTip(embeddable)) {
            sidetips.push(embeddable);
          }
        });
      });
    });
    return sidetips || [];
  }
  else {
    const sidetips: EmbeddableType[] = [];
    const sectionsInPage = currentPage?.sections;
    if (currentPage) {
      sectionsInPage.forEach((section) => {
        section.embeddables.forEach((embeddable) => {
          if (isEmbeddableSideTip(embeddable)) {
            sidetips.push(embeddable);
          }
        });
      });
    }
    return sidetips || [];
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
  for (let sectionIdx = 0; sectionIdx < currentSectionIndex; sectionIdx++) {
    sections[sectionIdx].embeddables.forEach((embeddable) => {
      if (isQuestion(embeddable)) {
        numQuestions++;
      }
    });
  }
  return numQuestions;
};

export const numQuestionsOnPreviousPages = (currentPage: number, activity: Activity) => {
  let numQuestions = 0;
  const visiblePages = activity.pages.filter(p => !p.is_hidden);

  if (queryValue("author-preview")) {
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
  } else {
    for (let page = 0; page < currentPage - 1; page++) {
      for (let section = 0; section < visiblePages[page].sections.length; section++) {
        if(!visiblePages[page].sections[section].is_hidden) {
          for (let embeddableNum = 0; embeddableNum < visiblePages[page].sections[section].embeddables.length; embeddableNum++) {
            const embeddableWrapper = visiblePages[page].sections[section].embeddables[embeddableNum];
            if (isQuestion(embeddableWrapper) && !embeddableWrapper.is_hidden) {
              numQuestions++;
            }
          }
        }
      }
    }
    return numQuestions;
  }
};

export const enableReportButton = (activity: Activity) => {
  const hasCompletionPage = activity.pages.find((page: any) => page.is_completion);
  return !hasCompletionPage && activity.student_report_enabled;
};

export const getLinkedPluginEmbeddable = (page: Page, id: string) => {
  for (let i = 0; i < page.sections.length; i++) {
    const linkedPluginEmbeddable = page.sections[i].embeddables.find((e: EmbeddableType) => e.embeddable_ref_id === id);
    if (linkedPluginEmbeddable?.type === "Embeddable::EmbeddablePlugin") {
      return linkedPluginEmbeddable;
    }
  }
  return undefined;
};

export const setAppBackgroundImage = (backgroundImageUrl?: string) => {
  const gradient = "linear-gradient(to bottom, #fff, rgba(255,255,255,0), rgba(255,255,255,0))";
  const el = document.querySelector("#app") as HTMLElement;
  el?.style.setProperty("background-image", `url(${backgroundImageUrl})` || gradient);
  el?.style.setProperty("background-size", "cover");
  el?.style.setProperty("background-repeat", "no-repeat");
};

export const setDocumentTitle = (params: ISetDocumentTitleParams) => {
  const { activity, sequence, sequenceActivityNum } = params;
  const setTabTitle = (title: string, pages: Page[]) => {
    // as a sanity check, ensure the page number is in the range [0, <number of pages>].
    const pageNumber = Math.max(0, Math.min(params.pageNumber, pages.length));
    document.title = pageNumber === 0
      ? title
      : `Page ${pageNumber} ${pages[pageNumber - 1].name || title}`;
  };

  if (sequence && sequenceActivityNum === 0) {
    const sequenceTitle = sequence.display_title || sequence.title || "Sequence";
    setTabTitle(sequenceTitle, []);
  } else if (activity) {
    const visiblePages = activity.pages.filter(p => !p.is_hidden);
    if (queryValue("author-preview")) {
      setTabTitle(activity.name, activity.pages);
    } else {
      setTabTitle(activity.name, visiblePages);
    }
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

export const getPageIDFromPosition = (activity: Activity, currentPosition: number): number | null => {
  for (const page of activity.pages) {
    if (page.position === currentPosition) {
      return page.id;
    }
  }
  return null;
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

const pluginsRequiringHeader = ["laraSharing"];
export const hasPluginThatRequiresHeader = (activity: Activity, embeddableRefId: string): boolean => {
  return activity.pages.reduce<boolean>((acc, page) => {
    return page.sections.reduce<boolean>((acc2, section) => {
      return section.embeddables.reduce<boolean>((acc3, embeddable) => {
        if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.embeddable_ref_id === embeddableRefId && pluginsRequiringHeader.includes(embeddable.plugin?.approved_script_label ?? "")) {
          acc3 = true;
        }
        return acc3;
      }, acc2);
    }, acc);
  }, false);
};

export const getEmbeddable = (activity: Activity, embeddableRefId: string) => {
  for (const page of activity.pages) {
    for (const section of page.sections) {
      const embeddable = section.embeddables.find((e: EmbeddableType) => e.ref_id === embeddableRefId);
      if (embeddable) {
        return embeddable;
      }
    }
  }
  return undefined;
};

export const getPageNumberFromEmbeddable = (activity: Activity, embeddableRefId: string) => {
  let pageNumber = 0;
  for (let i = 0; i < activity.pages.length; i++) {
    const page = activity.pages[i];
    if (page.is_hidden) {
      continue;
    }
    pageNumber++;
    for (const section of page.sections) {
      const embeddable = section.embeddables.find((e: EmbeddableType) => e.ref_id === embeddableRefId);
      if (embeddable) {
        return pageNumber;
      }
    }
  }
  return undefined;
};

export const getVisiblePages = (activity: Activity) => {
  return activity.pages.filter(page => !page.is_hidden);
};

export const getVisibleSections = (page: Page) => {
  return page.sections.filter(section => !section.is_hidden);
};

export const getVisibleEmbeddables = (section: any) => {
  return section.embeddables.filter((embeddable: any) => !embeddable.is_hidden);
};

export const isSequenceFinished = (sequence: Sequence, answers: WrappedDBAnswer[]|undefined): boolean => {
  return sequence.activities.every((activity) => {
    return isActivityFinished(activity, answers);
  });
};

export const isActivityFinished = (activity: Activity, answers: WrappedDBAnswer[] | undefined): boolean => {
  const { numAnswers, numQuestions } = getVisiblePages(activity)
    .flatMap(page => getVisibleSections(page))
    .flatMap(section => getVisibleEmbeddables(section))
    .filter(isQuestion)
    .reduce((acc, embeddable) => {
      acc.numQuestions++;
      const questionId = refIdToAnswersQuestionId(embeddable.ref_id);
      const authoredState = embeddable.authored_state ? JSON.parse(embeddable.authored_state) : {};
      const answer = answers?.find(a => a.meta.question_id === questionId);
      if (answer && answerHasResponse(answer, authoredState)) {
        acc.numAnswers++;
      }
      return acc;
    }, { numAnswers: 0, numQuestions: 0 });

  return numAnswers === numQuestions;
};
