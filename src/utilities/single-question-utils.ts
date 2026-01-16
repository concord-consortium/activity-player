// src/utilities/single-question-utils.ts

import { Activity, EmbeddableType } from "../types";

// Slide types for the flattened presentation
export type SlideType =
  | "introduction"      // Activity introduction (ActivitySummary)
  | "page-header"       // Page title/info slide
  | "section-header"    // Section title/info slide (if section has a name)
  | "embeddable"        // Actual embeddable content
  | "completion";       // Completion slide

export interface FlattenedSlide {
  type: SlideType;
  globalIndex: number;  // 0-based index across all slides

  // For embeddable slides
  embeddable?: EmbeddableType;
  questionNumber?: number | null;  // null if not a question type

  // For page-header and section-header slides
  pageIndex?: number;
  pageId?: number;
  pageName?: string | null;
  pageText?: string | null;  // Page intro text
  sectionIndex?: number;
  sectionName?: string | null;

  // For introduction slide
  activityName?: string;
  activityDescription?: string | null;
  activityThumbnail?: string | null;
  estimatedTime?: number | null;

  // Original hierarchy info (for all slide types)
  sourcePageIndex?: number;
  sourcePageId?: number;

  // Navigation behavior: if true, skip this slide during prev/next navigation
  // but still show it in the slider for boundary markers
  skipInNavigation?: boolean;
}

/**
 * Flattens an activity into a linear array of slides for slideshow-style navigation.
 * Includes: introduction, page headers, section headers (if named), embeddables, and completion.
 */
export const flattenActivityToSlides = (activity: Activity): FlattenedSlide[] => {
  const result: FlattenedSlide[] = [];
  let globalIndex = 0;
  let questionNumber = 1;

  // 1. Introduction slide (uses ActivitySummary component)
  result.push({
    type: "introduction",
    globalIndex: globalIndex++,
    activityName: activity.name,
    activityDescription: activity.description,
    activityThumbnail: activity.thumbnail_url,
    estimatedTime: activity.time_to_complete,
  });

  // 2. Content pages (excluding completion page)
  const visiblePages = activity.pages.filter(page => !page.is_hidden && !page.is_completion);

  visiblePages.forEach((page, pageIndex) => {
    // Page header slide - include in list for slider markers, but skip in navigation
    // if page has no meaningful name or intro text
    const hasPageContent = !!page.name?.trim() || !!page.text?.trim();
    result.push({
      type: "page-header",
      globalIndex: globalIndex++,
      pageIndex,
      pageId: page.id,
      pageName: page.name || null,
      pageText: page.text || null,
      sourcePageIndex: pageIndex,
      sourcePageId: page.id,
      skipInNavigation: !hasPageContent,
    });

    const visibleSections = page.sections.filter(section => !section.is_hidden);

    visibleSections.forEach((section, sectionIndex) => {
      // Section header slide - only add if section has a name, and mark for navigation
      // based on whether the name is meaningful
      const hasSectionContent = !!section.name?.trim();
      if (section.name) {
        result.push({
          type: "section-header",
          globalIndex: globalIndex++,
          pageIndex,
          pageId: page.id,
          pageName: page.name || null,
          sectionIndex,
          sectionName: section.name,
          sourcePageIndex: pageIndex,
          sourcePageId: page.id,
          skipInNavigation: !hasSectionContent,
        });
      }

      const visibleEmbeddables = section.embeddables.filter(emb => !emb.is_hidden);

      visibleEmbeddables.forEach((embeddable) => {
        const isQuestion = isQuestionType(embeddable);

        result.push({
          type: "embeddable",
          globalIndex: globalIndex++,
          embeddable,
          questionNumber: isQuestion ? questionNumber : null,
          pageIndex,
          pageId: page.id,
          pageName: page.name || null,
          sectionIndex,
          sectionName: section.name || null,
          sourcePageIndex: pageIndex,
          sourcePageId: page.id,
        });

        if (isQuestion) {
          questionNumber++;
        }
      });
    });
  });

  // 3. Completion slide
  result.push({
    type: "completion",
    globalIndex: globalIndex++,
  });

  return result;
};

/**
 * Determines if an embeddable is a "question" type (interactive that expects answers)
 */
export const isQuestionType = (embeddable: EmbeddableType): boolean => {
  return embeddable.type === "ManagedInteractive" ||
         embeddable.type === "MwInteractive";
};

/**
 * Gets the first slide index of the next/previous page.
 * For PageUp/PageDown navigation.
 */
export const getPageBoundaryIndex = (
  currentIndex: number,
  slides: FlattenedSlide[],
  direction: "next" | "prev"
): number => {
  if (slides.length === 0) return 0;

  const currentSlide = slides[currentIndex];

  // Special handling for introduction (no page) - go to first page header
  if (currentSlide.type === "introduction") {
    if (direction === "next") {
      const firstPageHeader = slides.findIndex(s => s.type === "page-header");
      return firstPageHeader >= 0 ? firstPageHeader : currentIndex + 1;
    }
    return 0; // Already at start
  }

  // Special handling for completion (no page) - go to last page
  if (currentSlide.type === "completion") {
    if (direction === "prev") {
      // Find the last page-header
      for (let i = slides.length - 2; i >= 0; i--) {
        if (slides[i].type === "page-header") {
          return i;
        }
      }
    }
    return slides.length - 1; // Already at end
  }

  const currentPageId = currentSlide.sourcePageId;

  if (direction === "next") {
    // Find next page-header or completion
    for (let i = currentIndex + 1; i < slides.length; i++) {
      if (slides[i].type === "page-header" || slides[i].type === "completion") {
        return i;
      }
    }
    return slides.length - 1; // Go to completion if no next page
  } else {
    // Find current page's page-header first
    let pageHeaderIndex = currentIndex;
    while (pageHeaderIndex > 0 && slides[pageHeaderIndex].type !== "page-header") {
      pageHeaderIndex--;
    }

    // If we're not at the page header, go there
    if (pageHeaderIndex < currentIndex && slides[pageHeaderIndex].sourcePageId === currentPageId) {
      return pageHeaderIndex;
    }

    // Otherwise find previous page's page-header
    for (let i = pageHeaderIndex - 1; i >= 0; i--) {
      if (slides[i].type === "page-header" || slides[i].type === "introduction") {
        return i;
      }
    }

    return 0; // Go to introduction
  }
};
