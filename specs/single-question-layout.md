# SingleQuestion Layout Specification

## Original Request

> I would like to create a new spec in the /specs folder (to be created) to add a new "activity layout" called "SingleQuestion". It will work like the current "single page" layout in that all elements of an activity are rendered BUT only a single element is shown at a time, like in a presentation. All the other questions will be hidden but rendered. Most questions are iframes and there is existing functionality for iframes to "talk" to each other so all must be rendered. You should investigate the typescript types of an activity and of a sequence (a group of activities). There are a number of sample activities and sequences in the src/data folder to look at to see examples.
>
> Start at src/components/app.tsx to see how single page activities are rendered and then create the plan with your initial thoughts on how the new activity layout can be implemented. I would like it to look like a slideshow presentation as a full page app (100vh/100vw) with auto scrollbars. A version of the current header should exist and then the main question area and then under that a "scrubber" that allows students to move between questions. It should also handle keyboard input with arrows moving between questions, home moving to the start, end moving to the end and page up/down moving between pages.
>
> If you have any questions please create a "## Questions" section at the end of the spec and ask your questions in the following format:
>
> Q: (your questions)
> A: (your best guess at an answer, using multiple choice if necessary)
>
> I will then answer the questions in the document and tell you they are answered so that you can then update the spec.
>
> We will iterate on this plan until it is complete. All development steps should be in phases and include full code for review.

---

## Overview

A new activity layout called "SingleQuestion" that presents activity content in a slideshow/presentation format. All embeddables are rendered (to maintain iframe communication) but only one is visible at a time. The layout is full-screen (100vh/100vw) with a header, main content area, and a navigation scrubber.

## Current Architecture Summary

### Existing Layout System
- Layouts are defined in `src/types.ts` via `ActivityLayouts` enum (0=MultiplePages, 1=SinglePage, 2=Notebook)
- Sequence-level overrides use `ActivityLayoutOverrides` enum (offset by 1)
- Layout routing happens in `src/components/app.tsx` in the `renderActivityContent` method (lines 570-612)
- SinglePage layout renders all pages/sections on one scrollable page via `SinglePageContent`

### Key Components
- `src/components/app.tsx` - Main routing and layout selection
- `src/components/single-page/single-page-content.tsx` - Reference implementation for rendering all embeddables
- `src/components/activity-page/embeddable.tsx` - Embeddable rendering (handles all types)
- `src/components/activity-header/header.tsx` - Current header component

### Embeddable Structure
Activities contain pages → sections → embeddables. Embeddables can be:
- `ManagedInteractive` - Library-based interactives (iframes)
- `MwInteractive` - Molecular Workbench interactives (iframes)
- `Embeddable::Xhtml` - Text/HTML content blocks
- `Embeddable::EmbeddablePlugin` - Plugin-based content
- `Embeddable::SpikeMediaLibrary` - Media library

## Proposed Design

### Target Environment

**Minimum viewport width: 1024px.** This application runs on desktop/laptop devices only. Mobile-specific responsive layouts are not required, though the UI should remain usable if the window is resized.

### Visual Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Activity Title                        [User Name]      │  ← Compact Header
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                                                                 │
│                                                                 │
│                    ┌───────────────────────┐                    │
│                    │                       │                    │
│                    │    Current Question   │                    │  ← Main Content Area
│                    │      (Embeddable)     │                    │     (auto-scrollable)
│                    │                       │                    │
│                    └───────────────────────┘                    │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  [◀]  ●──●──●──●──●──○──○──○──○──○  [▶]     Question 6 of 10    │  ← Scrubber/Navigation
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
SingleQuestionContent
├── SingleQuestionHeader (simplified header)
├── SingleQuestionMain
│   └── EmbeddableWrapper[] (ALL embeddables rendered once, visibility controlled via CSS)
│       └── Each wrapper uses display:none/block to show/hide
└── SingleQuestionScrubber
    ├── PrevButton
    ├── ProgressDots/Bar
    ├── NextButton
    └── QuestionCounter
```

### Critical Rendering Requirement

**All embeddables must be rendered once on mount and never unmounted during navigation.** This is essential because:
1. Embeddables are iframes to external pages that cannot be re-rendered without losing state
2. Iframes communicate with each other via the LARA plugin API (linked interactives)
3. Re-rendering would cause loss of student work and break inter-iframe communication

Navigation is achieved purely through CSS `display: none` / `display: block` (or `visibility: hidden` / `visibility: visible`) to show/hide embeddables without unmounting them from the DOM.

### WCAG Accessibility Compliance (Critical)

**All components must meet WCAG 2.1 AA standards.** This is a critical requirement for educational software accessibility.

#### Required Accessibility Features

1. **Focus Management**
   - Focus must move to the newly visible embeddable when navigating
   - Focus must be visible with a clear focus indicator (minimum 2px outline)
   - Focus must not be trapped within hidden elements
   - Skip navigation link to jump directly to content

2. **Screen Reader Support**
   - Live region announcements for navigation changes (e.g., "Question 3 of 10")
   - Proper heading hierarchy (h1 for activity title, h2 for question labels)
   - All interactive elements must have accessible names
   - Hidden embeddables must use `aria-hidden="true"` AND `inert` attribute

3. **Keyboard Accessibility**
   - All functionality must be accessible via keyboard
   - Logical tab order within visible content
   - Arrow key navigation must not conflict with embeddable controls (only active when focus is on navigation elements or document body)
   - Escape key should return focus to navigation controls

4. **Color and Contrast**
   - Minimum 4.5:1 contrast ratio for normal text
   - Minimum 3:1 contrast ratio for large text and UI components
   - Information must not be conveyed by color alone (scrubber dots use shape/size for current state)

5. **Motion and Animation**
   - Respect `prefers-reduced-motion` media query
   - No auto-playing animations that cannot be paused

6. **Touch Targets**
   - Minimum 44x44px touch target size for all interactive elements
   - Adequate spacing between interactive elements

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `ArrowRight` / `ArrowDown` | Next slide |
| `ArrowLeft` / `ArrowUp` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `PageDown` | Next page (group of slides from same page) |
| `PageUp` | Previous page |
| `Escape` | Return focus to navigation controls |
| `?` | Show/hide keyboard shortcuts help |

#### Keyboard Shortcuts Discoverability

To ensure keyboard shortcuts are discoverable (WCAG requirement), the layout includes:
1. A help button (?) in the scrubber that opens a modal with all shortcuts
2. Pressing `?` anywhere (when not in an input) shows the same help modal
3. The help modal can be closed with `Escape` or by clicking outside

## Implementation Phases

### Phase 1: Core Types and Layout Registration

**Files to modify:**
- `src/utilities/activity-utils.ts` - Add new layout enum values and helper function

**Changes:**

```typescript
// src/utilities/activity-utils.ts - Add to ActivityLayouts enum (around line 7)
export enum ActivityLayouts {
  MultiplePages = 0,
  SinglePage = 1,
  Notebook = 2,
  SingleQuestion = 3,  // NEW
}

// src/utilities/activity-utils.ts - Add to ActivityLayoutOverrides enum (around line 12)
export enum ActivityLayoutOverrides {
  MultiplePages = ActivityLayouts.MultiplePages + 1,
  SinglePage = ActivityLayouts.SinglePage + 1,
  Notebook = ActivityLayouts.Notebook + 1,
  SingleQuestion = ActivityLayouts.SingleQuestion + 1,  // NEW
}

// Add helper function (near other layout helpers)
export const isSingleQuestionLayout = (activity: Activity, sequenceActivityNum?: number, sequence?: Sequence) => {
  const layout = checkLayout(activity, sequenceActivityNum, sequence);
  return layout === ActivityLayouts.SingleQuestion;
};
```

---

### Phase 2: Development Override for Testing

**Files to modify:**
- `src/components/app.tsx` - Add development override constants and logic

**Purpose:**
During development, we need to test the SingleQuestion layout with existing activities/sequences before the layout is properly authored. This phase adds a temporary override mechanism.

**Changes:**

```typescript
// src/components/app.tsx - Add at the top of the file, after imports

// Development override for SingleQuestion layout testing
// Set to true to force all activities to use SingleQuestion layout
const FORCE_SINGLE_QUESTION_OVERRIDE = true;

// Check for query param override: ?forceSingleQuestionLayout=true
const SINGLE_QUESTION_OVERRIDE = FORCE_SINGLE_QUESTION_OVERRIDE ||
  new URLSearchParams(window.location.search).get("forceSingleQuestionLayout") === "true";
```

```typescript
// src/components/app.tsx - In the checkLayout method, after line 852 (after sequence override is applied)

// Development override for SingleQuestion layout testing
if (SINGLE_QUESTION_OVERRIDE && activity) {
  activity.layout = ActivityLayouts.SingleQuestion;
}
```

**Usage:**
- Set `FORCE_SINGLE_QUESTION_OVERRIDE = true` to test with any activity
- Or use URL parameter `?forceSingleQuestionLayout=true` to enable on-demand
- Set `FORCE_SINGLE_QUESTION_OVERRIDE = false` before production release

**Note:** This override should be removed or disabled before production deployment.

---

### Phase 3: Embeddable Flattening Utility

**New file:** `src/utilities/single-question-utils.ts`

This utility will flatten all embeddables from all pages/sections into a linear array for presentation navigation.

```typescript
// src/utilities/single-question-utils.ts

import { Activity, EmbeddableType, Page, SectionType } from "../types";

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
    const hasPageContent = !!(page.name && page.name.trim()) || !!(page.text && page.text.trim());
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
      const hasSectionContent = !!(section.name && section.name.trim());
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
  direction: 'next' | 'prev'
): number => {
  if (slides.length === 0) return 0;

  const currentSlide = slides[currentIndex];

  // Special handling for introduction (no page) - go to first page header
  if (currentSlide.type === "introduction") {
    if (direction === 'next') {
      const firstPageHeader = slides.findIndex(s => s.type === "page-header");
      return firstPageHeader >= 0 ? firstPageHeader : currentIndex + 1;
    }
    return 0; // Already at start
  }

  // Special handling for completion (no page) - go to last page
  if (currentSlide.type === "completion") {
    if (direction === 'prev') {
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

  if (direction === 'next') {
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
```

---

### Phase 4: SingleQuestion Components

#### 3.1 Main Container Component

**New file:** `src/components/single-question/single-question-content.tsx`

```typescript
// src/components/single-question/single-question-content.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity } from "../../types";
import { flattenActivityToSlides, FlattenedSlide, getPageBoundaryIndex } from "../../utilities/single-question-utils";
import { SingleQuestionHeader } from "./single-question-header";
import { SingleQuestionMain } from "./single-question-main";
import { SingleQuestionScrubber } from "./single-question-scrubber";
import { SingleQuestionKeyboardHelp } from "./single-question-keyboard-help";
import "./single-question-content.scss";

interface IProps {
  activity: Activity;
  userName: string;
  pluginsLoaded: boolean;
  teacherEditionMode?: boolean;
}

export const SingleQuestionContent: React.FC<IProps> = ({ activity, userName, pluginsLoaded, teacherEditionMode }) => {
  // Position preservation: restore saved position or start at 0
  const getInitialIndex = (): number => {
    const saved = sessionStorage.getItem(`sq-position-${activity.id}`);
    return saved ? parseInt(saved, 10) : 0;
  };

  const [currentIndex, setCurrentIndex] = useState(getInitialIndex);
  const [announcement, setAnnouncement] = useState("");
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  // Track which slides have been visited this session (for completion indicators)
  const [visitedSlides, setVisitedSlides] = useState<Set<number>>(() => new Set([getInitialIndex()]));
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(() => {
    return flattenActivityToSlides(activity);
  }, [activity]);

  // Position preservation: save position when it changes
  useEffect(() => {
    sessionStorage.setItem(`sq-position-${activity.id}`, currentIndex.toString());
    // Mark current slide as visited
    setVisitedSlides(prev => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
  }, [activity.id, currentIndex]);

  const totalCount = slides.length;

  // Compute page completion status based on visited slides
  // A page is "complete" when all embeddable slides on that page have been visited
  // TODO: For actual answer-based completion, integrate with Firebase answer tracking
  const pageCompletionStatus = useMemo(() => {
    const status: { [pageIndex: number]: boolean } = {};

    // Group embeddable slides by page
    const embeddablesByPage: { [pageIndex: number]: number[] } = {};
    slides.forEach((slide, index) => {
      if (slide.type === "embeddable" && slide.sourcePageIndex !== undefined) {
        if (!embeddablesByPage[slide.sourcePageIndex]) {
          embeddablesByPage[slide.sourcePageIndex] = [];
        }
        embeddablesByPage[slide.sourcePageIndex].push(index);
      }
    });

    // Check if all embeddables on each page have been visited
    Object.entries(embeddablesByPage).forEach(([pageIndex, slideIndices]) => {
      const allVisited = slideIndices.every(idx => visitedSlides.has(idx));
      status[Number(pageIndex)] = allVisited;
    });

    return status;
  }, [slides, visitedSlides]);

  // WCAG: Announce navigation changes to screen readers
  const announceNavigation = useCallback((index: number) => {
    const slide = slides[index];
    let text: string;

    switch (slide.type) {
      case "introduction":
        text = "Activity introduction";
        break;
      case "page-header":
        text = `Page: ${slide.pageName}`;
        break;
      case "section-header":
        text = `Section: ${slide.sectionName}`;
        break;
      case "embeddable":
        text = slide.questionNumber
          ? `Question ${slide.questionNumber}`
          : `Item ${index + 1} of ${totalCount}`;
        break;
      case "completion":
        text = "Activity completion";
        break;
      default:
        text = `Item ${index + 1} of ${totalCount}`;
    }

    setAnnouncement(text);
  }, [slides, totalCount]);

  // Direct navigation (used by slider clicks, breadcrumbs, etc.)
  const navigateTo = useCallback((index: number) => {
    const clampedIndex = Math.max(0, Math.min(index, totalCount - 1));
    setCurrentIndex(clampedIndex);
    announceNavigation(clampedIndex);
  }, [totalCount, announceNavigation]);

  // Find next valid slide index, skipping slides marked with skipInNavigation
  const findNextNavigableIndex = useCallback((fromIndex: number, direction: 'next' | 'prev'): number => {
    const step = direction === 'next' ? 1 : -1;
    let nextIndex = fromIndex + step;

    while (nextIndex >= 0 && nextIndex < totalCount) {
      if (!slides[nextIndex].skipInNavigation) {
        return nextIndex;
      }
      nextIndex += step;
    }

    // If no valid slide found, stay at current or go to boundary
    return direction === 'next' ? totalCount - 1 : 0;
  }, [slides, totalCount]);

  const navigateNext = useCallback(() => {
    const nextIndex = findNextNavigableIndex(currentIndex, 'next');
    if (nextIndex !== currentIndex) {
      navigateTo(nextIndex);
    }
  }, [currentIndex, findNextNavigableIndex, navigateTo]);

  const navigatePrev = useCallback(() => {
    const prevIndex = findNextNavigableIndex(currentIndex, 'prev');
    if (prevIndex !== currentIndex) {
      navigateTo(prevIndex);
    }
  }, [currentIndex, findNextNavigableIndex, navigateTo]);

  const navigateToStart = useCallback(() => {
    navigateTo(0);
  }, [navigateTo]);

  const navigateToEnd = useCallback(() => {
    navigateTo(totalCount - 1);
  }, [navigateTo, totalCount]);

  const navigateNextPage = useCallback(() => {
    const nextIndex = getPageBoundaryIndex(currentIndex, slides, 'next');
    navigateTo(nextIndex);
  }, [currentIndex, slides, navigateTo]);

  const navigatePrevPage = useCallback(() => {
    const prevIndex = getPageBoundaryIndex(currentIndex, slides, 'prev');
    navigateTo(prevIndex);
  }, [currentIndex, slides, navigateTo]);

  // Navigate to a specific page's page-header slide (for breadcrumb navigation)
  const navigateToPage = useCallback((pageIndex: number) => {
    const slideIndex = slides.findIndex(
      slide => slide.type === "page-header" && slide.sourcePageIndex === pageIndex
    );
    if (slideIndex >= 0) {
      navigateTo(slideIndex);
    }
  }, [slides, navigateTo]);

  // Navigate to a specific section's section-header slide (for breadcrumb navigation)
  const navigateToSection = useCallback((pageIndex: number, sectionIndex: number) => {
    const slideIndex = slides.findIndex(
      slide => slide.type === "section-header" &&
               slide.sourcePageIndex === pageIndex &&
               slide.sectionIndex === sectionIndex
    );
    if (slideIndex >= 0) {
      navigateTo(slideIndex);
    }
  }, [slides, navigateTo]);

  // Touch swipe gesture support for navigation
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (event: TouchEvent) => {
      // Don't capture swipes that start inside iframes
      if ((event.target as HTMLElement).closest("iframe")) return;

      const touch = event.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (event: TouchEvent) => {
      if (!touchStartRef.current) return;

      // Don't capture swipes that end inside iframes
      if ((event.target as HTMLElement).closest("iframe")) {
        touchStartRef.current = null;
        return;
      }

      const touch = event.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Minimum swipe distance (50px) and must be more horizontal than vertical
      const minSwipeDistance = 50;
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);

      if (isHorizontalSwipe && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX < 0) {
          // Swipe left = next slide
          navigateNext();
        } else {
          // Swipe right = previous slide
          navigatePrev();
        }
      }

      touchStartRef.current = null;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigateNext, navigatePrev]);

  // WCAG: Keyboard navigation - only intercept when focus is on navigation elements or body
  // to avoid conflicts with embeddable controls (e.g., arrow keys in text editors)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      // Don't capture if user is typing in an input or interacting with embeddable content
      if (target instanceof HTMLInputElement ||
          target instanceof HTMLTextAreaElement ||
          target.closest("iframe") ||
          target.isContentEditable) {
        return;
      }

      // Only handle navigation keys when focus is on scrubber, body, or main container
      const isNavigationContext =
        target === document.body ||
        target.closest(".single-question-scrubber") ||
        target.closest(".single-question-content") === containerRef.current;

      if (!isNavigationContext) {
        return;
      }

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          event.preventDefault();
          navigateNext();
          break;
        case "ArrowLeft":
        case "ArrowUp":
          event.preventDefault();
          navigatePrev();
          break;
        case "Home":
          event.preventDefault();
          navigateToStart();
          break;
        case "End":
          event.preventDefault();
          navigateToEnd();
          break;
        case "PageDown":
          event.preventDefault();
          navigateNextPage();
          break;
        case "PageUp":
          event.preventDefault();
          navigatePrevPage();
          break;
        case "Escape":
          // WCAG: Return focus to scrubber navigation
          event.preventDefault();
          const scrubber = containerRef.current?.querySelector<HTMLButtonElement>(
            ".single-question-scrubber__nav-button"
          );
          scrubber?.focus();
          break;
        case "?":
          // WCAG: Toggle keyboard shortcuts help
          event.preventDefault();
          setShowKeyboardHelp(prev => !prev);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigateNext, navigatePrev, navigateToStart, navigateToEnd, navigateNextPage, navigatePrevPage]);

  if (totalCount === 0) {
    return (
      <div className="single-question-content single-question-content--empty">
        <SingleQuestionHeader activity={activity} userName={userName} />
        <div className="single-question-empty-message">
          This activity has no content to display.
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];

  return (
    <div
      className="single-question-content"
      ref={containerRef}
      role="group"
      aria-roledescription="carousel"
      aria-label={`${activity.name} - ${totalCount} slides`}
    >
      {/* WCAG: Skip link for keyboard users */}
      <a
        href="#single-question-main"
        className="single-question-content__skip-link"
      >
        Skip to content
      </a>

      {/* WCAG: Live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="single-question-content__announcer visually-hidden"
      >
        {announcement}
      </div>

      <SingleQuestionHeader
        activity={activity}
        userName={userName}
        currentSlide={currentSlide}
        onNavigateToPage={navigateToPage}
        onNavigateToSection={navigateToSection}
      />
      <SingleQuestionMain
        activity={activity}
        slides={slides}
        currentIndex={currentIndex}
        pluginsLoaded={pluginsLoaded}
        teacherEditionMode={teacherEditionMode}
        onNavigateNext={navigateNext}
      />
      <SingleQuestionScrubber
        currentIndex={currentIndex}
        totalCount={totalCount}
        currentSlide={currentSlide}
        slides={slides}
        onNavigate={navigateTo}
        onPrev={navigatePrev}
        onNext={navigateNext}
        canGoPrev={currentIndex > 0}
        canGoNext={currentIndex < totalCount - 1}
        pageCompletionStatus={pageCompletionStatus}
        onShowHelp={() => setShowKeyboardHelp(true)}
      />

      {/* Keyboard shortcuts help modal */}
      <SingleQuestionKeyboardHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
};
```

#### 3.2 Header Component

**New file:** `src/components/single-question/single-question-header.tsx`

```typescript
// src/components/single-question/single-question-header.tsx

import React, { useContext } from "react";
import { Activity, Sequence } from "../../types";
import { FlattenedSlide } from "../../utilities/single-question-utils";
import { PortalDataContext } from "../portal-data-context";
import CCLogo from "../../assets/cc-logo.svg";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import "./single-question-header.scss";

interface IProps {
  activity: Activity;
  userName: string;
  sequence?: Sequence;
  currentSlide?: FlattenedSlide;
  onShowSequenceLanding?: () => void;
  onNavigateToPage?: (pageIndex: number) => void;
  onNavigateToSection?: (pageIndex: number, sectionIndex: number) => void;
}

export const SingleQuestionHeader: React.FC<IProps> = ({
  activity,
  userName,
  sequence,
  currentSlide,
  onShowSequenceLanding,
  onNavigateToPage,
  onNavigateToSection,
}) => {
  const portalData = useContext(PortalDataContext);
  const projectLogo = portalData?.project?.logo_ap || null;

  // Build breadcrumb items based on current slide context
  const renderBreadcrumb = () => {
    const items: JSX.Element[] = [];

    // Sequence level (if present)
    if (sequence && onShowSequenceLanding) {
      items.push(
        <button
          key="sequence"
          className="single-question-header__breadcrumb-item single-question-header__breadcrumb-item--clickable"
          onClick={onShowSequenceLanding}
          aria-label={`Return to ${sequence.display_title || sequence.title}`}
        >
          {sequence.display_title || sequence.title}
        </button>
      );
    }

    // Activity level
    items.push(
      <span key="activity" className="single-question-header__breadcrumb-item">
        {activity.name}
      </span>
    );

    // Page level (if applicable)
    if (currentSlide && currentSlide.pageName && currentSlide.pageIndex !== undefined) {
      items.push(
        <button
          key="page"
          className="single-question-header__breadcrumb-item single-question-header__breadcrumb-item--clickable"
          onClick={() => onNavigateToPage?.(currentSlide.pageIndex!)}
          aria-label={`Go to ${currentSlide.pageName}`}
        >
          {currentSlide.pageName}
        </button>
      );
    }

    // Section level (if applicable and has a name)
    if (currentSlide && currentSlide.sectionName && currentSlide.sectionIndex !== undefined) {
      items.push(
        <button
          key="section"
          className="single-question-header__breadcrumb-item single-question-header__breadcrumb-item--clickable"
          onClick={() => onNavigateToSection?.(currentSlide.pageIndex!, currentSlide.sectionIndex!)}
          aria-label={`Go to ${currentSlide.sectionName}`}
        >
          {currentSlide.sectionName}
        </button>
      );
    }

    return items;
  };

  const breadcrumbItems = renderBreadcrumb();

  return (
    <header className="single-question-header">
      {/* WCAG: Visually hidden h1 ensures proper heading hierarchy for screen readers */}
      <h1 className="visually-hidden">{activity.name}</h1>

      <div className="single-question-header__left">
        {projectLogo ? (
          <img src={projectLogo} alt="Project logo" className="single-question-header__logo" />
        ) : (
          <CCLogo className="single-question-header__logo single-question-header__logo--default" />
        )}
      </div>
      <div className="single-question-header__center">
        {/* WCAG: Breadcrumb navigation with proper landmark and structure */}
        <nav
          className="single-question-header__breadcrumb"
          aria-label="Breadcrumb"
        >
          <ol className="single-question-header__breadcrumb-list">
            {breadcrumbItems.map((item, index) => (
              <li key={index} className="single-question-header__breadcrumb-list-item">
                {index > 0 && (
                  <IconChevronRight
                    className="single-question-header__breadcrumb-separator"
                    aria-hidden="true"
                  />
                )}
                {index === breadcrumbItems.length - 1 ? (
                  <span aria-current="page">{item}</span>
                ) : (
                  item
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      <div className="single-question-header__right">
        <span className="single-question-header__username">{userName}</span>
      </div>
    </header>
  );
};
```

#### 3.3 Main Content Area Component

**New file:** `src/components/single-question/single-question-main.tsx`

**IMPORTANT:** This component renders ALL slides once on mount. Navigation only changes CSS `display` property - components are never unmounted/remounted. This preserves iframe state and inter-iframe communication for embeddable slides.

```typescript
// src/components/single-question/single-question-main.tsx

import React, { useEffect, useRef } from "react";
import { Activity } from "../../types";
import { FlattenedSlide } from "../../utilities/single-question-utils";
import { Embeddable } from "../activity-page/embeddable";
import { SingleQuestionErrorBoundary } from "./single-question-error-boundary";
import { SingleQuestionIntroSlide } from "./slides/single-question-intro-slide";
import { SingleQuestionPageSlide } from "./slides/single-question-page-slide";
import { SingleQuestionSectionSlide } from "./slides/single-question-section-slide";
import { SingleQuestionCompletionSlide } from "./slides/single-question-completion-slide";
import "./single-question-main.scss";

interface IProps {
  activity: Activity;
  slides: FlattenedSlide[];
  currentIndex: number;
  fixedWidthLayout?: "ipad_friendly" | "1100px";
  pluginsLoaded: boolean;
  teacherEditionMode?: boolean;
  onNavigateNext: () => void;
}

export const SingleQuestionMain: React.FC<IProps> = ({
  activity,
  slides,
  currentIndex,
  fixedWidthLayout,
  pluginsLoaded,
  teacherEditionMode,
  onNavigateNext,
}) => {
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Determine fixed width class based on activity setting
  const getFixedWidthClass = (): string => {
    if (fixedWidthLayout === "ipad_friendly") return "single-question-main--fixed-width-ipad";
    if (fixedWidthLayout === "1100px") return "single-question-main--fixed-width-1100";
    return "";
  };

  // CRITICAL: All slides are rendered once and persist in the DOM.
  // Only the `style.display` property changes - no conditional rendering!
  // This ensures iframes maintain their state and can communicate with each other.

  // WCAG: Move focus to newly visible slide wrapper when navigating.
  // Focus the wrapper (not the first focusable element) to:
  // 1. Avoid unexpectedly entering iframes which can disorient users
  // 2. Let users hear the slide announcement before deciding to tab into content
  // 3. Give users control over when to interact with the slide content
  useEffect(() => {
    const currentWrapper = wrapperRefs.current[currentIndex];
    if (currentWrapper) {
      currentWrapper.focus();
    }
  }, [currentIndex]);

  const renderSlideContent = (slide: FlattenedSlide) => {
    switch (slide.type) {
      case "introduction":
        return (
          <SingleQuestionIntroSlide
            activityName={slide.activityName!}
            description={slide.activityDescription}
            thumbnailUrl={slide.activityThumbnail}
            estimatedTime={slide.estimatedTime}
            onStart={onNavigateNext}
          />
        );

      case "page-header":
        return (
          <SingleQuestionPageSlide
            pageName={slide.pageName!}
            pageText={slide.pageText}
            pageNumber={(slide.pageIndex ?? 0) + 1}
          />
        );

      case "section-header":
        return (
          <SingleQuestionSectionSlide
            sectionName={slide.sectionName!}
            pageName={slide.pageName}
          />
        );

      case "embeddable":
        return (
          <Embeddable
            embeddable={slide.embeddable!}
            questionNumber={slide.questionNumber || undefined}
            displayMode="stacked"
            sectionLayout="l-full-width"
            pluginsLoaded={pluginsLoaded}
            activityLayout={activity.layout}
            teacherEditionMode={teacherEditionMode}
          />
        );

      case "completion":
        return <SingleQuestionCompletionSlide />;

      default:
        return null;
    }
  };

  const getSlideLabel = (slide: FlattenedSlide, index: number): string => {
    switch (slide.type) {
      case "introduction":
        return "Activity introduction";
      case "page-header":
        return `Page: ${slide.pageName}`;
      case "section-header":
        return `Section: ${slide.sectionName}`;
      case "embeddable":
        return slide.questionNumber
          ? `Question ${slide.questionNumber}`
          : `Item ${index + 1}`;
      case "completion":
        return "Activity completion";
      default:
        return `Slide ${index + 1}`;
    }
  };

  return (
    <main
      id="single-question-main"
      className={`single-question-main ${getFixedWidthClass()}`}
      aria-label="Activity content"
    >
      {slides.map((slide, index) => {
        const isVisible = index === currentIndex;
        const slideKey = slide.type === "embeddable"
          ? slide.embeddable!.ref_id
          : `${slide.type}-${index}`;

        // Build class names for visibility state (enables CSS fade transition)
        const visibilityClass = isVisible
          ? "single-question-main__slide-wrapper--visible"
          : "single-question-main__slide-wrapper--hidden";

        const slideLabel = getSlideLabel(slide, index);

        return (
          <div
            key={slideKey}
            ref={(el) => (wrapperRefs.current[index] = el)}
            className={`single-question-main__slide-wrapper single-question-main__slide-wrapper--${slide.type} ${visibilityClass}`}
            // WCAG Carousel pattern: each slide is a group with roledescription
            role="group"
            aria-roledescription="slide"
            aria-label={`${slideLabel}, ${index + 1} of ${slides.length}`}
            aria-hidden={!isVisible}
            // WCAG: inert prevents focus and interaction with hidden content
            // @ts-expect-error - inert is valid HTML attribute but not in React types yet
            inert={!isVisible ? "" : undefined}
            tabIndex={isVisible ? -1 : undefined}
          >
            <SingleQuestionErrorBoundary slideLabel={slideLabel}>
              {renderSlideContent(slide)}
            </SingleQuestionErrorBoundary>
          </div>
        );
      })}
    </main>
  );
};
```

#### 3.4 Scrubber Component (Slider-based Navigation)

**New file:** `src/components/single-question/single-question-scrubber.tsx`

The scrubber uses a slider-based design that scales to any number of slides. It includes:
- Prev/Next buttons for slide-by-slide navigation
- Home/End buttons for jumping to first/last slide
- A slider with visual markers for page and activity boundaries
- Clicking near a boundary marker snaps to that position

```typescript
// src/components/single-question/single-question-scrubber.tsx

import React, { useCallback, useMemo, useRef } from "react";
import { FlattenedSlide } from "../../utilities/single-question-utils";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconSkipBack from "../../assets/svg-icons/icon-skip-back.svg";
import IconSkipForward from "../../assets/svg-icons/icon-skip-forward.svg";
import "./single-question-scrubber.scss";

interface BoundaryMarker {
  type: "activity" | "page";
  index: number;        // Slide index where this boundary starts
  position: number;     // Percentage position (0-100)
  label: string;        // For accessibility
  isComplete?: boolean; // Whether all questions in this page/activity are answered
}

// Completion status for a page, keyed by sourcePageIndex (0-based)
// Using pageIndex instead of pageId for reliable, consistent lookups
interface PageCompletionStatus {
  [pageIndex: number]: boolean;
}

interface IProps {
  currentIndex: number;
  totalCount: number;
  currentSlide: FlattenedSlide;
  slides: FlattenedSlide[];
  onNavigate: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
  // For sequence support - activity boundaries
  activityBoundaries?: { index: number; name: string; isComplete?: boolean }[];
  // Page completion status - which pages have all questions answered
  pageCompletionStatus?: PageCompletionStatus;
  // Keyboard help modal
  onShowHelp: () => void;
}

export const SingleQuestionScrubber: React.FC<IProps> = ({
  currentIndex,
  totalCount,
  currentSlide,
  slides,
  onNavigate,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
  activityBoundaries = [],
  pageCompletionStatus = {},
  onShowHelp,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);

  // Calculate boundary markers for pages and activities with completion status
  const boundaryMarkers = useMemo((): BoundaryMarker[] => {
    const markers: BoundaryMarker[] = [];

    // Add activity boundaries (if in a sequence)
    activityBoundaries.forEach(({ index, name, isComplete }) => {
      if (index > 0 && index < totalCount) {
        markers.push({
          type: "activity",
          index,
          position: (index / (totalCount - 1)) * 100,
          label: `Start of ${name}${isComplete ? " (complete)" : " (incomplete)"}`,
          isComplete,
        });
      }
    });

    // Add page boundaries with completion status
    slides.forEach((slide, index) => {
      if (slide.type === "page-header" && index > 0) {
        // Use sourcePageIndex for completion lookup (reliable 0-based index)
        const pageIndex = slide.sourcePageIndex ?? 0;
        const isComplete = pageCompletionStatus[pageIndex] ?? false;
        markers.push({
          type: "page",
          index,
          position: (index / (totalCount - 1)) * 100,
          label: `Start of ${slide.pageName || `Page ${pageIndex + 1}`}${isComplete ? " (complete)" : " (incomplete)"}`,
          isComplete,
        });
      }
    });

    return markers;
  }, [slides, totalCount, activityBoundaries, pageCompletionStatus]);

  // Calculate current position as percentage
  const currentPosition = totalCount > 1 ? (currentIndex / (totalCount - 1)) * 100 : 0;

  // Find nearest boundary or slide index when clicking on slider
  const handleSliderClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickPercent = (clickX / rect.width) * 100;

    // Calculate the slide index from click position
    const rawIndex = Math.round((clickPercent / 100) * (totalCount - 1));

    // Check if click is near a boundary marker (within 5% of slider width)
    const snapThreshold = 5;
    let snapIndex = rawIndex;

    for (const marker of boundaryMarkers) {
      if (Math.abs(clickPercent - marker.position) < snapThreshold) {
        snapIndex = marker.index;
        break;
      }
    }

    // Clamp to valid range
    const targetIndex = Math.max(0, Math.min(snapIndex, totalCount - 1));
    onNavigate(targetIndex);
  }, [totalCount, boundaryMarkers, onNavigate]);

  // Handle keyboard interaction on slider
  const handleSliderKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        onNext();
        break;
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        onPrev();
        break;
      case "Home":
        event.preventDefault();
        onNavigate(0);
        break;
      case "End":
        event.preventDefault();
        onNavigate(totalCount - 1);
        break;
    }
  }, [onNext, onPrev, onNavigate, totalCount]);

  // Generate aria-valuetext for screen readers
  const getSliderValueText = (): string => {
    const slideLabel = currentSlide.type === "embeddable" && currentSlide.questionNumber
      ? `Question ${currentSlide.questionNumber}`
      : currentSlide.type === "page-header"
        ? `Page: ${currentSlide.pageName}`
        : currentSlide.type === "introduction"
          ? "Introduction"
          : currentSlide.type === "completion"
            ? "Completion"
            : `Slide ${currentIndex + 1}`;

    return `${slideLabel}, ${currentIndex + 1} of ${totalCount}`;
  };

  return (
    <div className="single-question-scrubber" role="group" aria-label="Slide navigation">
      {/* Prev button */}
      <button
        className="single-question-scrubber__nav-button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="Previous slide"
      >
        <IconChevronLeft className="single-question-scrubber__icon" />
      </button>

      {/* Home button */}
      <button
        className="single-question-scrubber__nav-button"
        onClick={() => onNavigate(0)}
        disabled={currentIndex === 0}
        aria-label="Go to first slide"
      >
        <IconSkipBack className="single-question-scrubber__icon" />
      </button>

      {/* Slider with boundary markers */}
      <div className="single-question-scrubber__slider-container">
        <div
          ref={sliderRef}
          className="single-question-scrubber__slider"
          role="slider"
          tabIndex={0}
          aria-label="Slide position"
          aria-valuenow={currentIndex + 1}
          aria-valuemin={1}
          aria-valuemax={totalCount}
          aria-valuetext={getSliderValueText()}
          onClick={handleSliderClick}
          onKeyDown={handleSliderKeyDown}
        >
          {/* Track background */}
          <div className="single-question-scrubber__track" />

          {/* Progress fill (optional - shows completed portion) */}
          <div
            className="single-question-scrubber__progress"
            style={{ width: `${currentPosition}%` }}
          />

          {/* Boundary markers overlay (pointer-events: none) */}
          <div className="single-question-scrubber__markers" aria-hidden="true">
            {boundaryMarkers.map((marker, idx) => (
              <div
                key={`${marker.type}-${idx}`}
                className={`single-question-scrubber__marker single-question-scrubber__marker--${marker.type} ${marker.isComplete ? "single-question-scrubber__marker--complete" : "single-question-scrubber__marker--incomplete"}`}
                style={{ left: `${marker.position}%` }}
                title={marker.label}
              />
            ))}
          </div>

          {/* Thumb */}
          <div
            className="single-question-scrubber__thumb"
            style={{ left: `${currentPosition}%` }}
          />
        </div>
      </div>

      {/* End button */}
      <button
        className="single-question-scrubber__nav-button"
        onClick={() => onNavigate(totalCount - 1)}
        disabled={currentIndex === totalCount - 1}
        aria-label="Go to last slide"
      >
        <IconSkipForward className="single-question-scrubber__icon" />
      </button>

      {/* Next button */}
      <button
        className="single-question-scrubber__nav-button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next slide"
      >
        <IconChevronRight className="single-question-scrubber__icon" />
      </button>

      {/* Counter display */}
      <div className="single-question-scrubber__counter" aria-hidden="true">
        {currentIndex + 1} / {totalCount}
      </div>

      {/* Keyboard help button */}
      <button
        className="single-question-scrubber__help-button"
        onClick={onShowHelp}
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        ?
      </button>
    </div>
  );
};
```

#### 3.4.1 Keyboard Shortcuts Help Modal

**New file:** `src/components/single-question/single-question-keyboard-help.tsx`

This modal displays all available keyboard shortcuts. It can be triggered by the help button or by pressing `?`.

```typescript
// src/components/single-question/single-question-keyboard-help.tsx

import React, { useEffect, useRef } from "react";
import "./single-question-keyboard-help.scss";

interface IProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

const shortcuts: ShortcutItem[] = [
  { keys: ["→", "↓"], description: "Next slide" },
  { keys: ["←", "↑"], description: "Previous slide" },
  { keys: ["Home"], description: "First slide" },
  { keys: ["End"], description: "Last slide" },
  { keys: ["Page Down"], description: "Next page" },
  { keys: ["Page Up"], description: "Previous page" },
  { keys: ["Escape"], description: "Return to navigation" },
  { keys: ["?"], description: "Toggle this help" },
];

export const SingleQuestionKeyboardHelp: React.FC<IProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      // Focus trap: keep focus within modal
      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle click outside to close
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="single-question-keyboard-help__backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className="single-question-keyboard-help"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
      >
        <div className="single-question-keyboard-help__header">
          <h2 id="keyboard-help-title" className="single-question-keyboard-help__title">
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            className="single-question-keyboard-help__close"
            onClick={onClose}
            aria-label="Close keyboard shortcuts help"
          >
            ×
          </button>
        </div>

        <div className="single-question-keyboard-help__content">
          <table className="single-question-keyboard-help__table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td className="single-question-keyboard-help__keys">
                    {shortcut.keys.map((key, keyIndex) => (
                      <React.Fragment key={keyIndex}>
                        {keyIndex > 0 && <span className="single-question-keyboard-help__or"> or </span>}
                        <kbd className="single-question-keyboard-help__key">{key}</kbd>
                      </React.Fragment>
                    ))}
                  </td>
                  <td>{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="single-question-keyboard-help__footer">
          <p>Press <kbd>?</kbd> anytime to toggle this help.</p>
        </div>
      </div>
    </div>
  );
};
```

**New file:** `src/components/single-question/single-question-keyboard-help.scss`

```scss
// src/components/single-question/single-question-keyboard-help.scss

.single-question-keyboard-help__backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.single-question-keyboard-help {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  max-width: 400px;
  width: 90%;
  max-height: 80vh;
  overflow: auto;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #e0e0e0;
  }

  &__title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    margin: 0;
  }

  &__close {
    width: 44px; // WCAG: Minimum touch target
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #666;
    cursor: pointer;
    border-radius: 4px;

    &:hover {
      background-color: #f0f0f0;
    }

    &:focus {
      outline: 2px solid #0066cc;
      outline-offset: 2px;
    }
  }

  &__content {
    padding: 16px 20px;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 10px 8px;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }

    th {
      font-weight: 600;
      color: #333;
      font-size: 0.875rem;
    }

    td {
      color: #555;
    }

    tr:last-child td {
      border-bottom: none;
    }
  }

  &__keys {
    white-space: nowrap;
  }

  &__key {
    display: inline-block;
    padding: 4px 8px;
    background-color: #f5f5f5;
    border: 1px solid #ccc;
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.875rem;
    color: #333;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  &__or {
    color: #999;
    font-size: 0.75rem;
    margin: 0 4px;
  }

  &__footer {
    padding: 12px 20px;
    background-color: #f9f9f9;
    border-top: 1px solid #e0e0e0;
    text-align: center;

    p {
      margin: 0;
      font-size: 0.875rem;
      color: #666;
    }

    kbd {
      display: inline-block;
      padding: 2px 6px;
      background-color: #fff;
      border: 1px solid #ccc;
      border-radius: 3px;
      font-family: monospace;
      font-size: 0.75rem;
    }
  }
}

// WCAG: Respect reduced motion
@media (prefers-reduced-motion: reduce) {
  .single-question-keyboard-help__backdrop {
    animation: none;
  }
}
```

#### 3.4.2 Slide Error Boundary

**New file:** `src/components/single-question/single-question-error-boundary.tsx`

This error boundary wraps individual slides to prevent a failing embeddable from crashing the entire slideshow. If an embeddable throws an error, the boundary catches it and displays a friendly error message while allowing navigation to continue.

```typescript
// src/components/single-question/single-question-error-boundary.tsx

import React, { Component, ErrorInfo, ReactNode } from "react";
import "./single-question-error-boundary.scss";

interface IProps {
  children: ReactNode;
  slideLabel: string;
  onRetry?: () => void;
}

interface IState {
  hasError: boolean;
  error: Error | null;
}

export class SingleQuestionErrorBoundary extends Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): IState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error for debugging/monitoring
    console.error("Slide render error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="single-question-error-boundary" role="alert">
          <div className="single-question-error-boundary__content">
            <h3 className="single-question-error-boundary__title">
              Unable to load content
            </h3>
            <p className="single-question-error-boundary__message">
              There was a problem displaying "{this.props.slideLabel}".
              You can try again or continue to the next slide.
            </p>
            <button
              className="single-question-error-boundary__retry-button"
              onClick={this.handleRetry}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**New file:** `src/components/single-question/single-question-error-boundary.scss`

```scss
// src/components/single-question/single-question-error-boundary.scss

.single-question-error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 40px;

  &__content {
    text-align: center;
    max-width: 400px;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
  }

  &__message {
    font-size: 1rem;
    color: #666;
    line-height: 1.5;
    margin: 0 0 24px 0;
  }

  &__retry-button {
    padding: 12px 24px;
    font-size: 1rem;
    font-weight: 500;
    color: #fff;
    background-color: #0066cc;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    min-width: 44px; // WCAG: Minimum touch target
    min-height: 44px;

    &:hover {
      background-color: #0052a3;
    }

    &:focus {
      outline: 2px solid #0066cc;
      outline-offset: 2px;
    }
  }
}
```

#### 3.5 Slide Components

**New directory:** `src/components/single-question/slides/`

##### 3.5.1 Introduction Slide

**New file:** `src/components/single-question/slides/single-question-intro-slide.tsx`

Uses the existing `ActivitySummary` component for consistency, plus a clear "Start" button to guide students.

```typescript
// src/components/single-question/slides/single-question-intro-slide.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { ActivitySummary } from "../../activity-introduction/activity-summary";
import IconArrowRight from "../../../assets/svg-icons/icon-arrow-right.svg";
import "./single-question-intro-slide.scss";

interface IProps {
  activityName: string;
  description: string | null;
  thumbnailUrl: string | null;
  estimatedTime: number | null;
  onStart: () => void;
}

export const SingleQuestionIntroSlide: React.FC<IProps> = ({
  activityName,
  description,
  thumbnailUrl,
  estimatedTime,
  onStart,
}) => {
  return (
    <div className="single-question-intro-slide">
      <ActivitySummary
        activityName={activityName}
        introText={description}
        time={estimatedTime}
        imageUrl={thumbnailUrl}
      />
      <button
        className="single-question-intro-slide__start-button"
        onClick={onStart}
        aria-label="Start activity"
      >
        <DynamicText>Start</DynamicText>
        <IconArrowRight className="single-question-intro-slide__start-icon" aria-hidden="true" />
      </button>
      <p className="single-question-intro-slide__keyboard-hint">
        <DynamicText>You can also use arrow keys to navigate</DynamicText>
      </p>
    </div>
  );
};
```

##### 3.5.2 Page Header Slide

**New file:** `src/components/single-question/slides/single-question-page-slide.tsx`

```typescript
// src/components/single-question/slides/single-question-page-slide.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { renderHTML } from "../../../utilities/render-html";
import "./single-question-page-slide.scss";

interface IProps {
  pageName: string;
  pageText: string | null;
  pageNumber: number;
}

export const SingleQuestionPageSlide: React.FC<IProps> = ({
  pageName,
  pageText,
  pageNumber,
}) => {
  return (
    <div className="single-question-page-slide">
      <div className="single-question-page-slide__number">
        Page {pageNumber}
      </div>
      <h2 className="single-question-page-slide__title">
        <DynamicText>{pageName}</DynamicText>
      </h2>
      {pageText && (
        <div className="single-question-page-slide__text">
          <DynamicText>{renderHTML(pageText)}</DynamicText>
        </div>
      )}
    </div>
  );
};
```

##### 3.5.3 Section Header Slide

**New file:** `src/components/single-question/slides/single-question-section-slide.tsx`

```typescript
// src/components/single-question/slides/single-question-section-slide.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import "./single-question-section-slide.scss";

interface IProps {
  sectionName: string;
  pageName: string | null;
}

export const SingleQuestionSectionSlide: React.FC<IProps> = ({
  sectionName,
  pageName,
}) => {
  return (
    <div className="single-question-section-slide">
      {pageName && (
        <div className="single-question-section-slide__page-context">
          {pageName}
        </div>
      )}
      <h3 className="single-question-section-slide__title">
        <DynamicText>{sectionName}</DynamicText>
      </h3>
    </div>
  );
};
```

##### 3.5.4 Completion Slide

**New file:** `src/components/single-question/slides/single-question-completion-slide.tsx`

**Design Note:** The completion slide content (summary, next steps, etc.) requires separate design work - marked as TBD. However, a subtle celebratory animation plays when the user first arrives at this slide to provide a sense of accomplishment.

```typescript
// src/components/single-question/slides/single-question-completion-slide.tsx

import React, { useEffect, useState } from "react";
import IconCheck from "../../../assets/svg-icons/icon-check-circle.svg";
import "./single-question-completion-slide.scss";

export const SingleQuestionCompletionSlide: React.FC = () => {
  // Trigger entrance animation once when component becomes visible
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Small delay to ensure the slide transition completes first
    const timer = setTimeout(() => setHasAnimated(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`single-question-completion-slide ${hasAnimated ? "single-question-completion-slide--animate" : ""}`}>
      <IconCheck className="single-question-completion-slide__icon" />
      <h2 className="single-question-completion-slide__title">
        All done!
      </h2>
      <p className="single-question-completion-slide__message">
        (Completion page TBD)
      </p>
    </div>
  );
};
```

##### 3.5.5 Sequence Landing Page

**New file:** `src/components/single-question/slides/single-question-sequence-landing.tsx`

When viewing a sequence, this landing page is shown first. It displays all activities as cards that users can click to jump to.

```typescript
// src/components/single-question/slides/single-question-sequence-landing.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { Sequence, Activity } from "../../../types";
import { renderHTML } from "../../../utilities/render-html";
import IconCheck from "../../../assets/svg-icons/icon-check-circle.svg";
import "./single-question-sequence-landing.scss";

interface ActivityProgress {
  activityId: string;
  totalQuestions: number;
  answeredQuestions: number;
  isComplete: boolean;
}

interface IProps {
  sequence: Sequence;
  activityProgress?: ActivityProgress[];
  onActivitySelect: (activityIndex: number) => void;
}

export const SingleQuestionSequenceLanding: React.FC<IProps> = ({
  sequence,
  activityProgress = [],
  onActivitySelect,
}) => {
  const getProgressForActivity = (activityId: string): ActivityProgress | undefined => {
    return activityProgress.find(p => p.activityId === activityId);
  };

  const getProgressPercentage = (progress: ActivityProgress | undefined): number => {
    if (!progress || progress.totalQuestions === 0) return 0;
    return Math.round((progress.answeredQuestions / progress.totalQuestions) * 100);
  };
  return (
    <div className="single-question-sequence-landing">
      <div className="single-question-sequence-landing__header">
        {sequence.logo && (
          <img
            src={sequence.logo}
            alt=""
            className="single-question-sequence-landing__logo"
          />
        )}
        <h1 className="single-question-sequence-landing__title">
          <DynamicText>{sequence.display_title || sequence.title}</DynamicText>
        </h1>
        {sequence.description && (
          <div className="single-question-sequence-landing__description">
            <DynamicText>{renderHTML(sequence.description)}</DynamicText>
          </div>
        )}
      </div>

      <div className="single-question-sequence-landing__activities" role="list">
        {sequence.activities.map((activity, index) => {
          const progress = getProgressForActivity(activity.id?.toString() || "");
          const percentage = getProgressPercentage(progress);
          const isComplete = progress?.isComplete || false;

          return (
            <button
              key={activity.id || index}
              className={`single-question-sequence-landing__activity-card ${isComplete ? "single-question-sequence-landing__activity-card--complete" : ""}`}
              onClick={() => onActivitySelect(index)}
              role="listitem"
              aria-label={`${isComplete ? "Completed: " : ""}${activity.name}${progress ? `, ${percentage}% complete` : ""}`}
            >
              {activity.thumbnail_url && (
                <div className="single-question-sequence-landing__activity-thumbnail-wrapper">
                  <img
                    src={activity.thumbnail_url}
                    alt=""
                    className="single-question-sequence-landing__activity-thumbnail"
                  />
                  {isComplete && (
                    <div className="single-question-sequence-landing__complete-badge" aria-hidden="true">
                      <IconCheck className="single-question-sequence-landing__complete-icon" />
                    </div>
                  )}
                </div>
              )}
              <div className="single-question-sequence-landing__activity-info">
                <div className="single-question-sequence-landing__activity-header">
                  <span className="single-question-sequence-landing__activity-number">
                    Activity {index + 1}
                  </span>
                  {isComplete && !activity.thumbnail_url && (
                    <IconCheck
                      className="single-question-sequence-landing__complete-icon-inline"
                      aria-label="Completed"
                    />
                  )}
                </div>
                <h2 className="single-question-sequence-landing__activity-name">
                  <DynamicText>{activity.name}</DynamicText>
                </h2>
                {activity.description && (
                  <p className="single-question-sequence-landing__activity-description">
                    <DynamicText>{renderHTML(activity.description)}</DynamicText>
                  </p>
                )}
                {/* Progress bar */}
                {progress && progress.totalQuestions > 0 && (
                  <div className="single-question-sequence-landing__progress">
                    <div
                      className="single-question-sequence-landing__progress-bar"
                      role="progressbar"
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuetext={`${progress.answeredQuestions} of ${progress.totalQuestions} questions answered`}
                    >
                      <div
                        className="single-question-sequence-landing__progress-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="single-question-sequence-landing__progress-text" aria-hidden="true">
                      {progress.answeredQuestions}/{progress.totalQuestions}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

**New file:** `src/components/single-question/slides/single-question-sequence-landing.scss`

```scss
.single-question-sequence-landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 1000px;
  padding: 40px 20px;
  margin: 0 auto;

  &__header {
    text-align: center;
    margin-bottom: 40px;
  }

  &__logo {
    max-height: 60px;
    margin-bottom: 16px;
  }

  &__title {
    font-size: 2.5rem;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
  }

  &__description {
    font-size: 1.125rem;
    color: #555;
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }

  &__activities {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 24px;
    width: 100%;
  }

  &__activity-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    padding: 0;
    border: 2px solid #ddd;
    border-radius: 8px;
    background-color: #fff;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
    overflow: hidden;
    min-height: 44px; // WCAG: Minimum touch target

    // Incomplete activity hover - blue accent
    &:hover {
      border-color: #0066cc;
      box-shadow: 0 4px 12px rgba(0, 102, 204, 0.15);
      background-color: #f8fbff;
    }

    &:focus {
      outline: 2px solid #0066cc;
      outline-offset: 2px;
    }

    // Completed activity - green accent
    &--complete {
      border-color: #4caf50;
      background-color: #f9fdf9;

      // Completed activity hover - darker green, maintains green theme
      &:hover {
        border-color: #388e3c;
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.2);
        background-color: #f0f9f0;
      }

      &:focus {
        outline-color: #4caf50;
      }
    }
  }

  &__activity-thumbnail-wrapper {
    position: relative;
  }

  &__activity-thumbnail {
    width: 100%;
    height: 160px;
    object-fit: cover;
  }

  &__complete-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    background-color: #4caf50;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &__complete-icon {
    width: 20px;
    height: 20px;
    fill: #fff;
  }

  &__complete-icon-inline {
    width: 16px;
    height: 16px;
    fill: #4caf50;
    margin-left: 8px;
  }

  &__activity-info {
    padding: 16px;
  }

  &__activity-header {
    display: flex;
    align-items: center;
  }

  &__activity-number {
    font-size: 0.75rem;
    color: #666666; // WCAG: Improved contrast for small text (4.5:1 ratio)
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  &__activity-name {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    margin: 4px 0 8px 0;
  }

  &__activity-description {
    font-size: 0.875rem;
    color: #555;
    margin: 0 0 12px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  // Progress bar styles
  &__progress {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
  }

  &__progress-bar {
    flex: 1;
    height: 6px;
    background-color: #e0e0e0;
    border-radius: 3px;
    overflow: hidden;
  }

  &__progress-fill {
    height: 100%;
    background-color: #4caf50;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  &__progress-text {
    font-size: 0.75rem;
    color: #666666; // WCAG: Improved contrast for small text (4.5:1 ratio)
    min-width: 40px;
    text-align: right;
  }
}

// WCAG: Respect reduced motion preference
@media (prefers-reduced-motion: reduce) {
  .single-question-sequence-landing__activity-card {
    transition: none;
  }
  .single-question-sequence-landing__progress-fill {
    transition: none;
  }
}
```

##### 3.5.6 Slide Component Styles

**New file:** `src/components/single-question/slides/single-question-intro-slide.scss`

```scss
.single-question-intro-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 800px;
  width: 100%;
  padding: 40px;

  .activity-summary {
    text-align: center;

    .activity-title {
      margin-bottom: 24px;

      h1 {
        font-size: 2rem;
        color: #333;
      }
    }
  }

  // Prominent "Start" button to guide students
  &__start-button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 32px;
    padding: 16px 48px;
    font-size: 1.25rem;
    font-weight: 600;
    color: #fff;
    background-color: #0066cc;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    min-height: 56px; // Larger touch target for primary action
    transition: background-color 0.2s ease, transform 0.1s ease;

    &:hover {
      background-color: #0052a3;
    }

    &:focus {
      outline: 3px solid #0066cc;
      outline-offset: 3px;
    }

    &:active {
      transform: scale(0.98);
    }
  }

  &__start-icon {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }

  &__keyboard-hint {
    margin-top: 16px;
    font-size: 0.875rem;
    color: #666666; // WCAG: 4.5:1 contrast ratio for small text
    font-style: italic;
  }
}

// WCAG: Respect reduced motion
@media (prefers-reduced-motion: reduce) {
  .single-question-intro-slide__start-button {
    transition: none;

    &:active {
      transform: none;
    }
  }
}
```

**New file:** `src/components/single-question/slides/single-question-page-slide.scss`

```scss
.single-question-page-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 800px;
  width: 100%;
  padding: 40px;

  &__number {
    font-size: 0.875rem;
    color: #666666; // WCAG: Improved contrast for small text (4.5:1 ratio)
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }

  &__title {
    font-size: 2.5rem;
    font-weight: 600;
    color: #333;
    margin: 0 0 24px 0;
  }

  &__text {
    font-size: 1.125rem;
    color: #555;
    line-height: 1.6;
    max-width: 600px;
  }
}
```

**New file:** `src/components/single-question/slides/single-question-section-slide.scss`

```scss
.single-question-section-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 800px;
  width: 100%;
  padding: 40px;

  &__page-context {
    font-size: 0.875rem;
    color: #666666; // WCAG: Improved contrast for small text (4.5:1 ratio)
    margin-bottom: 8px;
  }

  &__title {
    font-size: 2rem;
    font-weight: 500;
    color: #333;
    margin: 0;
  }
}
```

**New file:** `src/components/single-question/slides/single-question-completion-slide.scss`

```scss
.single-question-completion-slide {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 800px;
  width: 100%;
  padding: 40px;

  // Initial state before animation
  &__icon {
    width: 80px;
    height: 80px;
    fill: #4caf50;
    margin-bottom: 24px;
    transform: scale(0.8);
    opacity: 0;
  }

  &__title {
    font-size: 2.5rem;
    font-weight: 600;
    color: #333;
    margin: 0 0 16px 0;
    transform: translateY(10px);
    opacity: 0;
  }

  &__message {
    transform: translateY(10px);
    opacity: 0;
  }

  // Animated state - subtle bounce for icon, fade-up for text
  &--animate {
    .single-question-completion-slide__icon {
      animation: completion-icon-pop 400ms ease-out forwards;
    }

    .single-question-completion-slide__title {
      animation: completion-fade-up 300ms ease-out 150ms forwards;
    }

    .single-question-completion-slide__message {
      animation: completion-fade-up 300ms ease-out 250ms forwards;
    }
  }
}

// Keyframes for celebration animation
@keyframes completion-icon-pop {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes completion-fade-up {
  0% {
    transform: translateY(10px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

// WCAG: Respect reduced motion - show content immediately without animation
@media (prefers-reduced-motion: reduce) {
  .single-question-completion-slide {
    &__icon,
    &__title,
    &__message {
      transform: none;
      opacity: 1;
      animation: none;
    }

    &--animate {
      .single-question-completion-slide__icon,
      .single-question-completion-slide__title,
      .single-question-completion-slide__message {
        animation: none;
      }
    }
  }
}

```

#### 3.6 Index Export

**New file:** `src/components/single-question/index.ts`

```typescript
export { SingleQuestionContent } from "./single-question-content";
```

---

### Phase 5: Styles

#### 4.1 Main Container Styles

**New file:** `src/components/single-question/single-question-content.scss`

```scss
// src/components/single-question/single-question-content.scss

.single-question-content {
  display: flex;
  flex-direction: column;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f5f5;

  // WCAG: Skip link for keyboard navigation
  &__skip-link {
    position: absolute;
    top: -100%;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    background-color: #0066cc;
    color: #fff;
    text-decoration: none;
    border-radius: 0 0 4px 4px;
    z-index: 1000;
    font-weight: 600;

    &:focus {
      top: 0;
      outline: 2px solid #fff;
      outline-offset: 2px;
    }
  }

  // WCAG: Visually hidden but accessible to screen readers
  &__announcer.visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  &--empty {
    .single-question-empty-message {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      color: #666;
    }
  }
}

// WCAG: Global focus styles for accessibility
.single-question-content *:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

// WCAG: Respect reduced motion preference
@media (prefers-reduced-motion: reduce) {
  .single-question-content,
  .single-question-content * {
    transition: none !important;
    animation: none !important;
  }
}
```

#### 4.2 Header Styles

**New file:** `src/components/single-question/single-question-header.scss`

```scss
// src/components/single-question/single-question-header.scss

// WCAG: Visually hidden utility for screen reader-only content
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// Using <header> semantic element - class for styling specificity
header.single-question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  min-height: 60px;
  padding: 0 20px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  &__left {
    display: flex;
    align-items: center;
    min-width: 150px;
  }

  &__logo {
    height: 36px;
    width: auto;

    &--default {
      fill: #333;
    }
  }

  &__center {
    flex: 1;
    text-align: center;
    padding: 0 20px;
    overflow: hidden;
  }

  // Breadcrumb navigation styles
  &__breadcrumb {
    display: flex;
    justify-content: center;
  }

  &__breadcrumb-list {
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding: 0;
    flex-wrap: nowrap;
    overflow: hidden;
  }

  &__breadcrumb-list-item {
    display: flex;
    align-items: center;
    min-width: 0; // Allow text truncation
  }

  &__breadcrumb-item {
    font-size: 1rem;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;

    &--clickable {
      background: none;
      border: none;
      padding: 4px 8px;
      margin: 0;
      cursor: pointer;
      color: #0066cc;
      font-size: 1rem;
      border-radius: 4px;
      min-height: 44px; // WCAG: Minimum touch target
      display: flex;
      align-items: center;

      &:hover {
        text-decoration: underline;
        background-color: rgba(0, 102, 204, 0.1);
      }

      &:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }
    }
  }

  &__breadcrumb-separator {
    width: 16px;
    height: 16px;
    fill: #666666; // WCAG: Improved contrast (3:1 ratio for UI components)
    flex-shrink: 0;
    margin: 0 4px;
  }

  &__right {
    display: flex;
    align-items: center;
    min-width: 150px;
    justify-content: flex-end;
  }

  &__username {
    font-size: 0.875rem;
    color: #666;
  }
}
```

#### 4.3 Main Content Styles

**New file:** `src/components/single-question/single-question-main.scss`

Note: Visibility is controlled via CSS classes (`--visible` / `--hidden`) rather than inline `display` styles. This allows for subtle fade transitions while still preventing interaction with hidden slides via `visibility: hidden` and `pointer-events: none`.

```scss
// src/components/single-question/single-question-main.scss

// Using <main> semantic element - class for styling specificity
main.single-question-main {
  flex: 1;
  position: relative;
  overflow: hidden;

  // All slide wrappers are positioned absolutely and layered.
  // Visibility is controlled via --visible/--hidden classes with a subtle fade.
  &__slide-wrapper {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    overflow: auto;

    // Subtle fade transition (150ms is quick enough to not feel sluggish)
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 150ms ease-out;

    // Visible state
    &--visible {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }

    // Hidden state (explicit for clarity)
    &--hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    // Slide type-specific styling
    &--introduction,
    &--page-header,
    &--section-header,
    &--completion {
      background-color: #f9f9f9;
    }

    &--embeddable {
      // Embeddable fills available space (full width by default)
      > .embeddable {
        width: 100%;
        height: 100%;
        max-height: 100%;
      }

      // For iframe-based embeddables, fill available vertical space with min/max constraints
      > .embeddable .managed-interactive,
      > .embeddable .mw-interactive {
        width: 100%;
        height: 100%;
        min-height: 300px;
        max-height: calc(100vh - 180px); // Account for header + scrubber
      }
    }
  }

  // Respect activity's fixed_width_layout setting
  // These classes are added to the container based on activity.fixed_width_layout
  &--fixed-width-ipad {
    .single-question-main__slide-wrapper--embeddable > .embeddable {
      max-width: 1024px; // iPad-friendly width
      margin: 0 auto;
    }
  }

  &--fixed-width-1100 {
    .single-question-main__slide-wrapper--embeddable > .embeddable {
      max-width: 1100px;
      margin: 0 auto;
    }
  }
}

// WCAG: Respect reduced motion preference - disable fade transition
@media (prefers-reduced-motion: reduce) {
  main.single-question-main .single-question-main__slide-wrapper {
    transition: none;
  }
}
```

#### 4.4 Scrubber Styles (Slider-based)

**New file:** `src/components/single-question/single-question-scrubber.scss`

```scss
// src/components/single-question/single-question-scrubber.scss

.single-question-scrubber {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 70px;
  min-height: 70px;
  padding: 0 20px;
  background-color: #fff;
  border-top: 1px solid #ddd;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.05);

  // WCAG: Navigation buttons with minimum 44x44px touch target
  &__nav-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border: 2px solid #666666; // WCAG: Improved contrast (3.9:1 ratio against white)
    border-radius: 50%;
    background-color: #fff;
    cursor: pointer;
    transition: background-color 0.2s ease, border-color 0.2s ease;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      background-color: #f0f0f0;
      border-color: #333;
    }

    &:focus {
      outline: 2px solid #0066cc;
      outline-offset: 2px;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      border-color: #ccc;
    }
  }

  &__icon {
    width: 20px;
    height: 20px;
    fill: #333;
  }

  // Slider container
  &__slider-container {
    flex: 1;
    max-width: 500px;
    min-width: 200px;
    padding: 0 8px;
  }

  &__slider {
    position: relative;
    height: 44px; // WCAG: Minimum touch target height
    cursor: pointer;
    display: flex;
    align-items: center;

    &:focus {
      outline: none;

      .single-question-scrubber__thumb {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }
    }
  }

  // Track background
  &__track {
    position: absolute;
    left: 0;
    right: 0;
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
  }

  // Progress fill (portion before current position)
  &__progress {
    position: absolute;
    left: 0;
    height: 8px;
    background-color: #0066cc;
    border-radius: 4px 0 0 4px;
    transition: width 0.1s ease-out;
  }

  // Boundary markers overlay
  &__markers {
    position: absolute;
    left: 0;
    right: 0;
    height: 100%;
    pointer-events: none; // Allow clicks to pass through to slider
  }

  &__marker {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);

    // Page boundary - thin line
    &--page {
      width: 2px;
      height: 16px;
    }

    // Activity boundary - thicker, more prominent
    &--activity {
      width: 4px;
      height: 24px;
      border-radius: 2px;
    }

    // Completion status colors
    &--incomplete {
      background-color: #e67e22; // Orange for incomplete - visible but not alarming
    }

    &--complete {
      background-color: #4caf50; // Green for complete - matches completion theme
    }

    // Activity markers are bolder
    &--activity#{&}--incomplete {
      background-color: #d35400; // Darker orange for activity boundaries
    }

    &--activity#{&}--complete {
      background-color: #388e3c; // Darker green for activity boundaries
    }
  }

  // Draggable thumb
  &__thumb {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 20px;
    height: 20px;
    background-color: #0066cc;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    transition: left 0.1s ease-out;
    // Ensure thumb is above markers
    z-index: 1;
  }

  // Counter display
  &__counter {
    min-width: 70px;
    text-align: center;
    font-size: 1rem;
    color: #333; // WCAG: 4.5:1 contrast ratio against white
    font-weight: 500;
    flex-shrink: 0;
  }

  // Help button for keyboard shortcuts
  &__help-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px; // WCAG: Minimum touch target
    height: 44px;
    border: 2px solid #666666;
    border-radius: 50%;
    background-color: #fff;
    cursor: pointer;
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    flex-shrink: 0;
    margin-left: 8px;
    transition: background-color 0.2s ease, border-color 0.2s ease;

    &:hover {
      background-color: #f0f0f0;
      border-color: #333;
    }

    &:focus {
      outline: 2px solid #0066cc;
      outline-offset: 2px;
    }
  }
}

// WCAG: Respect reduced motion preference
@media (prefers-reduced-motion: reduce) {
  .single-question-scrubber {
    &__nav-button {
      transition: none;
    }

    &__progress,
    &__thumb {
      transition: none;
    }
  }
}

// Responsive: Stack counter below on narrow screens
@media (max-width: 600px) {
  .single-question-scrubber {
    flex-wrap: wrap;
    height: auto;
    padding: 12px 20px;

    &__slider-container {
      order: 10;
      flex-basis: 100%;
      max-width: none;
      margin-top: 8px;
    }

    &__counter {
      order: 5;
    }
  }
}
```

---

### Phase 6: App Integration

**File to modify:** `src/components/app.tsx`

Add the new layout to the rendering logic:

```typescript
// Import at top of file
import { SingleQuestionContent } from "./single-question";

// In checkLayout method (around line 855), add handling for new override:
private checkLayout(activity: Activity, sequenceActivityNum?: number, sequence?: Sequence): number {
  // ... existing code ...

  // Add case for SingleQuestion override
  if (sequence?.layout_override === ActivityLayoutOverrides.SingleQuestion) {
    return ActivityLayouts.SingleQuestion;
  }

  return activity.layout;
}

// In renderActivityContent method (around line 570), add new condition:
private renderActivityContent() {
  const { activity } = this.state;
  if (!activity) return null;

  const layout = this.checkLayout(activity, this.state.sequenceActivityNum, this.state.sequence);

  // Add this condition before or after SinglePage check
  if (layout === ActivityLayouts.SingleQuestion) {
    return this.renderSingleQuestionContent(activity);
  }

  // ... existing layout conditions ...
}

// Add new render method:
private renderSingleQuestionContent(activity: Activity) {
  // pluginsLoaded and teacherEditionMode are tracked in App state
  return (
    <SingleQuestionContent
      activity={activity}
      userName={this.getUserName()}
      pluginsLoaded={this.state.pluginsLoaded}
      teacherEditionMode={this.state.mode === "teacher-edition"}
    />
  );
}
```

---

### Phase 7: Testing

**Implementation Note:** The test files below contain stubs outlining what should be tested. Actual test implementations must be written during development, using real activity fixtures from `src/data/` and following existing test patterns in the codebase.

#### 6.1 Unit Tests

**New file:** `src/utilities/single-question-utils.test.ts`

```typescript
import {
  flattenActivityToSlides,
  isQuestionType,
  getPageBoundaryIndex
} from "./single-question-utils";

describe("single-question-utils", () => {
  describe("flattenActivityToSlides", () => {
    it("should flatten embeddables from multiple pages", () => {
      // Test implementation
    });

    it("should exclude hidden pages", () => {
      // Test implementation
    });

    it("should exclude completion pages", () => {
      // Test implementation
    });

    it("should assign correct question numbers", () => {
      // Test implementation
    });
  });

  describe("isQuestionType", () => {
    it("should return true for ManagedInteractive", () => {
      // Test implementation
    });

    it("should return false for Embeddable::Xhtml", () => {
      // Test implementation
    });
  });

  describe("getPageBoundaryIndex", () => {
    it("should return next page start index", () => {
      // Test implementation
    });

    it("should return previous page start index", () => {
      // Test implementation
    });
  });
});
```

#### 6.2 Component Tests

**New file:** `src/components/single-question/single-question-content.test.tsx`

```typescript
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { SingleQuestionContent } from "./single-question-content";
// Import test fixtures and mocks

describe("SingleQuestionContent", () => {
  it("should render current embeddable as visible", () => {
    // Test implementation
  });

  it("should navigate with arrow keys", () => {
    // Test implementation
  });

  it("should navigate with scrubber clicks", () => {
    // Test implementation
  });

  it("should handle empty activity", () => {
    // Test implementation
  });
});
```

#### 6.3 Cypress E2E Tests

**New file:** `cypress/e2e/single-question-layout.test.ts`

```typescript
describe("Single Question Layout", () => {
  beforeEach(() => {
    // Load activity with SingleQuestion layout
  });

  it("should display one embeddable at a time", () => {
    // Test implementation
  });

  it("should navigate with keyboard", () => {
    // Test implementation
  });

  it("should navigate with scrubber", () => {
    // Test implementation
  });

  it("should maintain iframe state when navigating", () => {
    // Test implementation
  });
});
```

#### 6.4 Accessibility Tests (Critical)

**New file:** `src/components/single-question/single-question-content.a11y.test.tsx`

WCAG compliance testing is critical. Use jest-axe for automated accessibility testing.

```typescript
import React from "react";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import { SingleQuestionContent } from "./single-question-content";
// Import test fixtures and mocks

expect.extend(toHaveNoViolations);

describe("SingleQuestionContent Accessibility", () => {
  it("should have no WCAG violations", async () => {
    const { container } = render(
      <SingleQuestionContent activity={mockActivity} userName="Test User" pluginsLoaded={true} />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("should have proper heading hierarchy", () => {
    const { container } = render(
      <SingleQuestionContent activity={mockActivity} userName="Test User" pluginsLoaded={true} />
    );
    const h1 = container.querySelector("h1");
    expect(h1).toBeInTheDocument();
    expect(h1).toHaveTextContent(mockActivity.name);
  });

  it("should have skip link that targets main content", () => {
    const { getByText } = render(
      <SingleQuestionContent activity={mockActivity} userName="Test User" pluginsLoaded={true} />
    );
    const skipLink = getByText("Skip to content");
    expect(skipLink).toHaveAttribute("href", "#single-question-main");
  });

  it("should have live region for announcements", () => {
    const { container } = render(
      <SingleQuestionContent activity={mockActivity} userName="Test User" pluginsLoaded={true} />
    );
    const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
    expect(liveRegion).toBeInTheDocument();
  });

  it("should mark hidden slides with aria-hidden and inert", () => {
    const { container } = render(
      <SingleQuestionContent activity={mockActivity} userName="Test User" pluginsLoaded={true} />
    );
    const hiddenWrappers = container.querySelectorAll(
      '.single-question-main__slide-wrapper[aria-hidden="true"]'
    );
    hiddenWrappers.forEach((wrapper) => {
      expect(wrapper).toHaveAttribute("inert");
    });
  });

  it("should move focus to new slide on navigation", async () => {
    const { container, getByLabelText } = render(
      <SingleQuestionContent activity={mockActivity} userName="Test User" pluginsLoaded={true} />
    );

    const nextButton = getByLabelText("Next slide");
    nextButton.click();

    // Focus should move to the newly visible slide wrapper
    await waitFor(() => {
      const activeWrapper = container.querySelector(
        '.single-question-main__slide-wrapper[aria-hidden="false"]'
      );
      expect(activeWrapper?.contains(document.activeElement)).toBe(true);
    });
  });

  it("should have minimum touch target sizes", () => {
    const { container } = render(
      <SingleQuestionContent activity={mockActivity} userName="Test User" pluginsLoaded={true} />
    );

    const navButtons = container.querySelectorAll(".single-question-scrubber__nav-button");
    navButtons.forEach((button) => {
      const rect = button.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });
  });
});
```

---

### Phase 8: Sample Activity Data

**New file:** `src/data/sample-activity-single-question-layout.json`

Create a sample activity JSON file with `"layout": 3` to test the new layout.

---

## File Summary

### New Files
- `src/utilities/single-question-utils.ts` - Slide flattening utilities
- `src/utilities/single-question-utils.test.ts` - Unit tests for utilities
- `src/components/single-question/index.ts` - Module exports
- `src/components/single-question/single-question-content.tsx` - Main container component
- `src/components/single-question/single-question-content.scss` - Container styles
- `src/components/single-question/single-question-header.tsx` - Header component
- `src/components/single-question/single-question-header.scss` - Header styles
- `src/components/single-question/single-question-main.tsx` - Main content area (renders all slides)
- `src/components/single-question/single-question-main.scss` - Main content styles
- `src/components/single-question/single-question-scrubber.tsx` - Navigation scrubber
- `src/components/single-question/single-question-scrubber.scss` - Scrubber styles
- `src/components/single-question/single-question-error-boundary.tsx` - Error boundary for graceful degradation
- `src/components/single-question/single-question-error-boundary.scss` - Error boundary styles
- `src/components/single-question/single-question-keyboard-help.tsx` - Keyboard shortcuts help modal
- `src/components/single-question/single-question-keyboard-help.scss` - Keyboard help modal styles
- `src/components/single-question/slides/single-question-intro-slide.tsx` - Introduction slide (uses ActivitySummary)
- `src/components/single-question/slides/single-question-intro-slide.scss` - Introduction slide styles
- `src/components/single-question/slides/single-question-page-slide.tsx` - Page header slide
- `src/components/single-question/slides/single-question-page-slide.scss` - Page header styles
- `src/components/single-question/slides/single-question-section-slide.tsx` - Section header slide
- `src/components/single-question/slides/single-question-section-slide.scss` - Section header styles
- `src/components/single-question/slides/single-question-completion-slide.tsx` - Completion slide (TBD)
- `src/components/single-question/slides/single-question-completion-slide.scss` - Completion slide styles
- `src/components/single-question/slides/single-question-sequence-landing.tsx` - Sequence landing page
- `src/components/single-question/slides/single-question-sequence-landing.scss` - Sequence landing styles
- `src/components/single-question/single-question-content.test.tsx` - Component tests
- `src/components/single-question/single-question-content.a11y.test.tsx` - Accessibility tests
- `cypress/e2e/single-question-layout.test.ts` - E2E tests
- `src/data/sample-activity-single-question-layout.json` - Sample activity data

### Modified Files
- `src/utilities/activity-utils.ts` - Add new layout enum values and helper function
- `src/components/app.tsx` - Add layout routing

---

## Questions

Q: Should text blocks (`Embeddable::Xhtml`) be included as slides, or only interactive/question embeddables?
A: **(a) Include all embeddable types as slides** ✓ - All embeddables are included in the flattened slides array.

Q: When there are many embeddables (e.g., 50+), how should the scrubber dots handle overflow?
A: **(a) Horizontal scroll within the dot track** ✓ - Current design.

Q: Should the layout support an "introduction" slide before the first embeddable (similar to the intro page in MultiplePages layout)?
A: **(a) Yes, show activity intro as first slide** ✓ - Uses the existing ActivitySummary component.

Q: For the scrubber, should clicking on a dot immediately navigate, or should there be some visual feedback/confirmation?
A: **(a) Immediate navigation on click** ✓ - Current design.

Q: Should there be a completion/summary slide at the end?
A: **(a) Yes, show activity completion as final slide** ✓ - Shows "All done! (completion page TBD)" placeholder.

Q: How should the layout handle activities that are part of a sequence? Should there be navigation to next/previous activities?
A: **Add an initial sequence landing page** ✓ - Shows all activities in the sequence as cards. User clicks to "jump" to an activity. Header includes a button to return to this sequence view.

Q: Should the visible embeddable container have a maximum width, or should it expand to fill available space?
A: **(b) Full width for maximum interactive space** ✓ - Respects the activity's `fixed_width_layout` setting if present.

Q: For iframe embeddables, how should the height be determined?
A: **(c) Fill available vertical space** ✓ - With minimum/maximum constraints.

Q: The unit test file (Phase 6.1) references `flattenActivityEmbeddables` but the function was renamed to `flattenActivityToSlides`. Should the test file be updated to match?
A: **(a) Yes, update test to use `flattenActivityToSlides`** ✓

Q: Should the scrubber visually distinguish different slide types (introduction, page-header, section-header, embeddable, completion) with different dot styles/shapes?
A: **(a) Yes, use different visual indicators** ✓ - Larger dots for page headers, icons for intro/completion.

Q: When a user returns to the sequence landing page from an activity, should we preserve their position in that activity so they can resume later?
A: **(a) Yes, store current slide index per activity and restore on return** ✓

Q: Should the header display the current page/section context (breadcrumb-style) in addition to the activity title?
A: **(a) Yes, show breadcrumb navigation** ✓ - "Sequence (if present) > Activity > Page > Section" with clickable parent items. WCAG compliant.

Q: For the sequence landing page, should there be visual indicators showing activity completion progress (e.g., checkmarks, progress bars)?
A: **(a) Yes, show completion status for each activity card** ✓

---

## User Prompts Transcript

This section documents **most** (the AI lost the context by the end when I asked for it) user prompts/instructions given during the development of this specification.

1. "Can you review the spec now as a UI expert and let me know of any of your concerns? Keep in mind WCAG compliance is critical at the same time. Again don't make any changes just list them for me and then ask one by one if I want the change to be made."

2. "No, skip that one but document it. This app always runs on desktops with at least 1024 width." (regarding scrubber crowding with many slides)

3. "Yes but don't go crazy. A subtle animation would be good but a dramatic one repeated 30 times would get tiresome." (regarding adding visual transition between slides)

4. "Before you go on - do we need to ensure absolute/fix positioning since we are now using visibility so we don't show the outer scrollbars?" (regarding CSS implementation of slide visibility)

5. "No - that needs to be designed, thus the TBD placeholder. Maybe a fun animation would be good though when the user reaches that page." (regarding completion page content)

6. "No, lets skip that. We don't have any now and the iframes are 99% pointing at content we control and that loads quickly." (regarding loading state for embeddables)

7. "No, but can we ensure it uses ellipsis for truncation so the user knows there is more?" (regarding breadcrumb text truncation)

8. "Yes - but I thought our slider at the bottom would do that since it shows where the user is at right?" (regarding slider thumb size concern)

9. "Yes, lets add that." (regarding swipe gesture support)

10. "yes" (regarding activity card hover state differentiation)

11. "no" (regarding page overview/thumbnail view)

12. "Yes - since we are superimposing non-clickable elements already over the slider can we use that for pages too or will it be too crowded?" (regarding progress showing completion status)

13. "yes, lets go with option 3" (regarding color-coded boundary markers)

14. "Can you review the spec now as a expert developer and let me know of any of your concerns? Again don't make any changes just list them for me and then ask one by one if I want the change to be made."

15. "Yes - why don't we just keep our own page counter internally and use that - or do you have a better idea?" (regarding pageId type mismatch)

16. "Yes" (regarding using sourcePageIndex instead of pageId)

17. "yes" (regarding fixing enum location in activity-utils.ts)

18. "yes" (regarding adding pluginsLoaded prop)

19. "yes" (regarding adding teacherEditionMode prop)

20. "skip that one" (regarding session storage key collision)

21. "yes" (regarding adding test stub implementation note)

22. "yes" (regarding adding error boundary)

23. "yes" (regarding wiring up breadcrumb navigation)

24. "No, that is for a different layout - it can be ignored." (regarding hideQuestionNumbers prop)

25. "yes" (regarding fixing test class names)

26. "what does this mean exactly?" (asking about Firebase completion tracking)

27. "Firebase is all setup but lets leave that as a TODO item in the code now. Instead lets track what questions the user has seen this session that compute it from that." (regarding completion tracking implementation)

28. "Can you review the spec now as a student user (middle school through college) and let me know of any of your concerns? Again don't make any changes just list them for me and then ask one by one if I want the change to be made."

29. "yes" (regarding adding Start button to introduction slide)

30. "Yes - but I thought our slider at the bottom would do that right?" (regarding progress indicator - decided to skip)

31. "Lets keep them if the name property has a value, otherwise lets skip showing the page but still keep it in the flattened list so we can see the indicator on the slider. lots of activities don't have page or section names." (regarding page/section headers as wasted clicks)

32. "can't the user use the progress bar to skip ahead and use the page down and end buttons?" (regarding skip ahead functionality - decided to skip)

33. "keep the placeholder for now" (regarding completion slide content)

34. "nope, the data is saved automatically in firebase" (regarding Exit button - skipped)

35. "how would you fix that?" (asking about keyboard shortcuts discoverability)

36. "lets use option c" (regarding keyboard hint on intro slide)

37. "I think we are good. I would like you do to another review just to ensure the spec is fully consistent in both numbering and flow." (requesting consistency review)

38. "yes" (regarding fixing consistency issues)

39. "Can you think of any other roles that should review the spec?"

40. "I think we are good." (regarding additional review roles - declined)

41. "can you generate a transcript of all my questions in this chat?"

42. "please continue but add this to the spec at the end under a new header" (regarding adding transcript to spec)

43. "before the review session transcript add a transcript of the session before the review started." (regarding adding initial Q&A transcript)

44. "and before that can you add a transcript of all the questions before the q&a?" (clarifying request)

45. "sorry, not questions but all my prompts" (clarifying to add user prompts transcript)

---

## Initial Design Q&A Transcript

This section documents the initial design questions asked during spec development (before expert reviews).

**Q: Should text blocks (`Embeddable::Xhtml`) be included as slides, or only interactive/question embeddables?**
> Answer: Include all embeddable types as slides.

**Q: When there are many embeddables (e.g., 50+), how should the scrubber dots handle overflow?**
> Answer: Horizontal scroll within the dot track. (Later changed to slider-based design.)

**Q: Should the layout support an "introduction" slide before the first embeddable?**
> Answer: Yes, show activity intro as first slide using the existing ActivitySummary component.

**Q: For the scrubber, should clicking on a dot immediately navigate, or should there be some visual feedback/confirmation?**
> Answer: Immediate navigation on click.

**Q: Should there be a completion/summary slide at the end?**
> Answer: Yes, show activity completion as final slide.

**Q: How should the layout handle activities that are part of a sequence?**
> Answer: Add an initial sequence landing page showing all activities as cards. User clicks to jump to an activity. Header includes a button to return to sequence view.

**Q: Should the visible embeddable container have a maximum width, or expand to fill available space?**
> Answer: Full width for maximum interactive space, but respect the activity's `fixed_width_layout` setting if present.

**Q: For iframe embeddables, how should the height be determined?**
> Answer: Fill available vertical space with minimum/maximum constraints.

**Q: The unit test file references `flattenActivityEmbeddables` but the function was renamed. Should the test file be updated?**
> Answer: Yes, update test to use `flattenActivityToSlides`.

**Q: Should the scrubber visually distinguish different slide types with different dot styles/shapes?**
> Answer: Yes, use different visual indicators - larger dots for page headers, icons for intro/completion.

**Q: When a user returns to the sequence landing page from an activity, should we preserve their position?**
> Answer: Yes, store current slide index per activity and restore on return.

**Q: Should the header display current page/section context (breadcrumb-style)?**
> Answer: Yes, show breadcrumb navigation with clickable parent items.

**Q: For the sequence landing page, should there be visual indicators showing activity completion progress?**
> Answer: Yes, show completion status for each activity card.

**Q: Should WCAG accessibility compliance be a priority?**
> Answer: Yes, WCAG 2.1 AA compliance is critical for educational software.

**Q: What keyboard shortcuts should be supported?**
> Answer: Arrow keys (next/prev slide), Home/End (first/last), PageUp/PageDown (page boundaries), Escape (return focus to navigation), ? (show help).

**Q: How should keyboard navigation avoid conflicts with embeddable controls?**
> Answer: Only intercept keyboard events when focus is on navigation elements or document body, not when user is in an iframe or input field.

---

## Review Session Transcript

This section documents the iterative review process conducted on this specification.

### UI Expert Review

**Concern #1: Scrubber crowding with many slides**
> Decision: Skip - documented that minimum viewport width is 1024px (desktop only).

**Concern #2: No visual transition between slides**
> Decision: Yes, add subtle animation. Added 150ms fade transition using CSS opacity/visibility classes with `prefers-reduced-motion` support.

**Concern #3: Completion page is just a placeholder**
> Decision: Keep as TBD placeholder but add a subtle celebration animation when user reaches completion slide.

**Concern #4: No loading state for embeddables**
> Decision: Skip - iframes point to content we control that loads quickly.

**Concern #5: Breadcrumb text truncation**
> Decision: Ensure ellipsis truncation is used so users know there is more text. Added `text-overflow: ellipsis` with `max-width: 200px`.

**Concern #6: Slider thumb size might be too small**
> Decision: Not an issue - the slider uses a click-anywhere model, not precise thumb targeting.

**Concern #7: No swipe gesture support**
> Decision: Yes, add touch swipe support. Added horizontal swipe detection (50px minimum, must be more horizontal than vertical) that doesn't capture swipes inside iframes.

**Concern #8: Activity card hover states don't differentiate complete/incomplete**
> Decision: Yes, add differentiated hover states. Incomplete activities use blue accent on hover; completed activities use green accent on hover.

**Concern #9: No page overview/thumbnail view**
> Decision: Skip.

**Concern #10: Progress doesn't visually show completion status**
> Decision: Yes, add color-coded boundary markers. Page markers show orange (incomplete) or green (complete) based on whether all embeddables on that page have been visited.

### Developer Expert Review

**Concern #1: pageId type mismatch (number vs string)**
> Decision: Use `sourcePageIndex` (0-based internal index) instead of `pageId` for reliable lookups.

**Concern #2: Layout enum location incorrect**
> Decision: Fixed - enums are in `src/utilities/activity-utils.ts`, not `src/types.ts`.

**Concern #3: Missing `pluginsLoaded` prop**
> Decision: Yes, add throughout component chain. Added to `SingleQuestionContent`, `SingleQuestionMain`, and `Embeddable` usage.

**Concern #4: Missing `teacherEditionMode` prop**
> Decision: Yes, add throughout component chain. Added to `SingleQuestionContent`, `SingleQuestionMain`, and `Embeddable` usage.

**Concern #5: Session storage key collision**
> Decision: Skip - current key format `sq-position-${activity.id}` is sufficient.

**Concern #6: Test stubs are empty**
> Decision: Added implementation note that actual test implementations must be written during development.

**Concern #7: Missing error boundary**
> Decision: Yes, add error boundary. Created `SingleQuestionErrorBoundary` component that wraps individual slides to prevent one failing embeddable from crashing the entire slideshow.

**Concern #8: `is_hidden` sections not filtered**
> Decision: Already correct - the flattening logic filters `section.is_hidden`.

**Concern #9: Breadcrumb navigation not wired up**
> Decision: Yes, wire it up. Added `navigateToPage` and `navigateToSection` callbacks passed through header.

**Concern #10: Missing `hideQuestionNumbers` prop**
> Decision: Skip - that's for a different layout feature, not applicable here.

**Concern #11: Wrong class names in tests**
> Decision: Fixed - tests now reference `__slide-wrapper` instead of `__embeddable-wrapper`.

**Concern #12: No Firebase completion tracking**
> Decision: Leave Firebase integration as TODO. Instead, track visited slides in session state and compute page completion from that. Added `visitedSlides` state and `pageCompletionStatus` computed value with TODO comment for future Firebase integration.

### Student User Review

**Concern #1: No "Start" button on introduction**
> Decision: Yes, add prominent Start button. Added button with arrow icon and styles to intro slide.

**Concern #2: No progress indicator showing where I am**
> Decision: Skip - the slider at the bottom already shows current position.

**Concern #3: Page/section headers feel like wasted clicks**
> Decision: Keep headers in the flattened list for slider markers, but skip them during prev/next navigation if they have no meaningful name or text. Added `skipInNavigation` flag and `findNextNavigableIndex` helper.

**Concern #4: Can't skip ahead to see what's coming**
> Decision: Skip - users can use the progress bar to skip ahead, plus PageDown and End keyboard shortcuts.

**Concern #5: Completion page doesn't show what I did**
> Decision: Keep as TBD placeholder for now.

**Concern #6: No Exit button**
> Decision: Skip - data is saved automatically in Firebase, no explicit save/exit needed.

**Concern #7: Keyboard shortcuts not discoverable**
> Decision: Use Option C - add brief instruction text on introduction slide. Added `"You can also use arrow keys to navigate"` hint below Start button.

**Concern #8: Breadcrumb section names confusing**
> Decision: Skip - empty names are already handled by the skipInNavigation logic.

**Concern #9: No visual feedback on question completion**
> Decision: Noted as future enhancement - outside scope of layout spec.

**Concern #10: Can't see all answers before finishing**
> Decision: Already addressed via SummaryTable on existing completion page.

**Concern #11: Progress bar ticks too tiny**
> Decision: Acceptable with click-anywhere slider model.

**Concern #12: Accidentally lost place**
> Decision: Addressed via keyboard navigation and session storage position persistence.

### Consistency Review

**Issue #1: Section 3.6 placement**
> Finding: Actually correct on review - no change needed.

**Issue #2: File Summary listed `src/types.ts` incorrectly**
> Decision: Fixed - removed `types.ts` from modified files, updated `activity-utils.ts` description to include enum changes.

**Issue #3: Missing SCSS import in error boundary**
> Finding: Actually present at line 1704 - no change needed.
