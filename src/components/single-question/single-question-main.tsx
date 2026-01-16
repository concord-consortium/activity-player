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

  const renderSlideContent = (slide: FlattenedSlide, isVisible: boolean) => {
    switch (slide.type) {
      case "introduction":
        return (
          <SingleQuestionIntroSlide
            activityName={slide.activityName ?? "Activity"}
            description={slide.activityDescription}
            thumbnailUrl={slide.activityThumbnail}
            estimatedTime={slide.estimatedTime}
            onStart={onNavigateNext}
          />
        );

      case "page-header":
        return (
          <SingleQuestionPageSlide
            pageName={slide.pageName ?? "Page"}
            pageText={slide.pageText}
            pageNumber={(slide.pageIndex ?? 0) + 1}
          />
        );

      case "section-header":
        return (
          <SingleQuestionSectionSlide
            sectionName={slide.sectionName ?? "Section"}
            pageName={slide.pageName}
          />
        );

      case "embeddable":
        if (!slide.embeddable) return null;
        return (
          <Embeddable
            embeddable={slide.embeddable}
            questionNumber={slide.questionNumber || undefined}
            displayMode="stacked"
            sectionLayout="l-full-width"
            pluginsLoaded={pluginsLoaded}
            activityLayout={activity.layout}
            teacherEditionMode={teacherEditionMode}
          />
        );

      case "completion":
        return <SingleQuestionCompletionSlide isVisible={isVisible} />;

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
        const slideKey = slide.type === "embeddable" && slide.embeddable
          ? slide.embeddable.ref_id
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
              {renderSlideContent(slide, isVisible)}
            </SingleQuestionErrorBoundary>
          </div>
        );
      })}
    </main>
  );
};
