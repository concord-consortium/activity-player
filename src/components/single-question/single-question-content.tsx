// src/components/single-question/single-question-content.tsx

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Activity } from "../../types";
import { flattenActivityToSlides, getPageBoundaryIndex } from "../../utilities/single-question-utils";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const slides = useMemo(() => {
    return flattenActivityToSlides(activity);
  }, [activity]);

  // Position preservation: save position when it changes
  useEffect(() => {
    sessionStorage.setItem(`sq-position-${activity.id}`, currentIndex.toString());
  }, [activity.id, currentIndex]);

  const totalCount = slides.length;

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
  const findNextNavigableIndex = useCallback((fromIndex: number, direction: "next" | "prev"): number => {
    const step = direction === "next" ? 1 : -1;
    let nextIndex = fromIndex + step;

    while (nextIndex >= 0 && nextIndex < totalCount) {
      if (!slides[nextIndex].skipInNavigation) {
        return nextIndex;
      }
      nextIndex += step;
    }

    // If no valid slide found, stay at current or go to boundary
    return direction === "next" ? totalCount - 1 : 0;
  }, [slides, totalCount]);

  const navigateNext = useCallback(() => {
    const nextIndex = findNextNavigableIndex(currentIndex, "next");
    if (nextIndex !== currentIndex) {
      navigateTo(nextIndex);
    }
  }, [currentIndex, findNextNavigableIndex, navigateTo]);

  const navigatePrev = useCallback(() => {
    const prevIndex = findNextNavigableIndex(currentIndex, "prev");
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
    const nextIndex = getPageBoundaryIndex(currentIndex, slides, "next");
    navigateTo(nextIndex);
  }, [currentIndex, slides, navigateTo]);

  const navigatePrevPage = useCallback(() => {
    const prevIndex = getPageBoundaryIndex(currentIndex, slides, "prev");
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
        case "Escape": {
          // WCAG: Return focus to scrubber navigation
          event.preventDefault();
          const scrubber = containerRef.current?.querySelector<HTMLButtonElement>(
            ".single-question-scrubber__nav-button"
          );
          scrubber?.focus();
          break;
        }
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
