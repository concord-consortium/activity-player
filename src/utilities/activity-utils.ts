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

export const isQuestion = (embeddable: any) => {
  return ((embeddable.embeddable.type === "ManagedInteractive" && embeddable.embeddable.library_interactive.data.enable_learner_state)
          || (embeddable.embeddable.type === "MwInteractive" && embeddable.embeddable.enable_learner_state));
};

export interface PageSectionQuestionCount {
  Header: number;
  InfoAssessment: number;
  InteractiveBlock: number;
}

export const isEmbeddableSectionHidden = (page: any, section: string | null) => {
  const isSectionHidden = ((section === EmbeddableSections.Introduction && !page.show_header)
    || (section === EmbeddableSections.Interactive && !page.show_interactive)
    || (!section && !page.show_info_assessment));
  return isSectionHidden;
};

export const getPageSectionQuestionCount = (page: any) => {
  const pageSectionQuestionCount: PageSectionQuestionCount = { Header: 0, InfoAssessment: 0, InteractiveBlock: 0 };
  for (let embeddableNum = 0; embeddableNum < page.embeddables.length; embeddableNum++) {
    const embeddable = page.embeddables[embeddableNum];
    if (isQuestion(embeddable) && !embeddable.embeddable.is_hidden) {
      if (embeddable.section === EmbeddableSections.Introduction && !isEmbeddableSectionHidden(page, embeddable.section)) {
        pageSectionQuestionCount.Header++;
      } else if (!embeddable.section && !isEmbeddableSectionHidden(page, embeddable.section)) {
        pageSectionQuestionCount.InfoAssessment++;
      } else if (embeddable.section === EmbeddableSections.Interactive && !isEmbeddableSectionHidden(page, embeddable.section)) {
        pageSectionQuestionCount.InteractiveBlock++;
      }
    }
  }
  return pageSectionQuestionCount;
};

export const numQuestionsOnPreviousPages = (currentPage: number, activity: any) => {
  let numQuestions = 0;
  for (let page = 0; page < currentPage - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddable = activity.pages[page].embeddables[embeddableNum];
        if (isQuestion(embeddable) && !embeddable.embeddable.is_hidden && !isEmbeddableSectionHidden(activity.pages[page], embeddable.embeddable.section)) {
          numQuestions++;
        }
      }
    }
  }
  return numQuestions;
};
