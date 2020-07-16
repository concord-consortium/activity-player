export enum PageLayouts {
  FullWidth = "l-full-width",
  Responsive = "l-responsive",
  SixtyForty = "l-6040",
  FortySixty = "r-4060",
}

export enum EmbeddableSections {
  Interactive = "interactive_box",
  Introduction = "header_block",
}

export const isQuestion = (embeddable: any) => {
  return (embeddable.embeddable.type === "ManagedInteractive");
  // embeddable.embeddable.type === "Embeddable::MultipleChoice"); TODO: handle old question types?
};

export const numIntroductionQuestionsOnPage = (page: any) => {
  let numQuestions = 0;
  for (let embeddableNum = 0; embeddableNum < page.embeddables.length; embeddableNum++) {
    const embeddable = page.embeddables[embeddableNum];
    if (embeddable.section === EmbeddableSections.Introduction && isQuestion(embeddable)) {
      numQuestions++;
    }
  }
  return numQuestions;
};

export const numQuestionsOnPreviousPages = (currentPage: number, activity: any) => {
  let numQuestions = 0;
  for (let page = 0; page < currentPage - 1; page++) {
    for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
      const embeddable = activity.pages[page].embeddables[embeddableNum];
      if ((!embeddable.section || embeddable.section === EmbeddableSections.Introduction) && isQuestion(embeddable)) {
        numQuestions++;
      }
    }
  }
  return numQuestions;
};
