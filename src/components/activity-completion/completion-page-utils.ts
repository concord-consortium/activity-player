import { Activity, Page } from "../../types";

export const getVisiblePages = (activity: Activity) => {
  return activity.pages.filter(page => !page.is_hidden);
};

export const getVisibleSections = (page: Page) => {
  return page.sections.filter(section => !section.is_hidden);
};

export const getVisibleEmbeddables = (section: any) => {
  return section.embeddables.filter((embeddable: any) => !embeddable.is_hidden);
};