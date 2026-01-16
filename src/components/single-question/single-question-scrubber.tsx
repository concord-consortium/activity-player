// src/components/single-question/single-question-scrubber.tsx

import React, { useCallback, useRef } from "react";
import { FlattenedSlide } from "../../utilities/single-question-utils";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconSkipBack from "../../assets/svg-icons/icon-skip-back.svg";
import IconSkipForward from "../../assets/svg-icons/icon-skip-forward.svg";
import "./single-question-scrubber.scss";

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
  onShowHelp,
}) => {
  const dotsContainerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard interaction on dots container
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

  // Generate label for a slide
  const getSlideLabel = (slide: FlattenedSlide, index: number): string => {
    if (slide.type === "embeddable" && slide.questionNumber) {
      return `Question ${slide.questionNumber}`;
    }
    if (slide.type === "page-header") {
      return `Page: ${slide.pageName}`;
    }
    if (slide.type === "section-header") {
      return `Section: ${slide.sectionName}`;
    }
    if (slide.type === "introduction") {
      return "Introduction";
    }
    if (slide.type === "completion") {
      return "Completion";
    }
    return `Slide ${index + 1}`;
  };

  // Generate aria-valuetext for screen readers
  const getSliderValueText = (): string => {
    const slideLabel = getSlideLabel(currentSlide, currentIndex);
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
        <IconChevronLeft className="single-question-scrubber__icon" width={20} height={20} />
      </button>

      {/* Home button */}
      <button
        className="single-question-scrubber__nav-button"
        onClick={() => onNavigate(0)}
        disabled={currentIndex === 0}
        aria-label="Go to first slide"
      >
        <IconSkipBack className="single-question-scrubber__icon" width={20} height={20} />
      </button>

      {/* Dot navigation */}
      <div
        ref={dotsContainerRef}
        className="single-question-scrubber__dots-container"
        role="slider"
        tabIndex={0}
        aria-label="Slide position"
        aria-valuenow={currentIndex + 1}
        aria-valuemin={1}
        aria-valuemax={totalCount}
        aria-valuetext={getSliderValueText()}
        onKeyDown={handleSliderKeyDown}
      >
        {slides.map((slide, index) => {
          const isCurrent = index === currentIndex;
          const isPageBoundary = slide.type === "page-header" && index > 0;
          const isActivityBoundary = activityBoundaries.some(b => b.index === index);

          // Determine dot type for styling
          let dotType = "default";
          if (slide.type === "introduction") dotType = "intro";
          else if (slide.type === "completion") dotType = "completion";
          else if (isActivityBoundary) dotType = "activity";
          else if (isPageBoundary) dotType = "page";

          return (
            <button
              key={slide.type === "embeddable" && slide.embeddable ? slide.embeddable.ref_id : `${slide.type}-${index}`}
              className={`single-question-scrubber__dot single-question-scrubber__dot--${dotType} ${isCurrent ? "single-question-scrubber__dot--current" : ""}`}
              onClick={() => onNavigate(index)}
              aria-label={`Go to slide ${index + 1}: ${getSlideLabel(slide, index)}`}
              aria-current={isCurrent ? "step" : undefined}
              tabIndex={-1}
            />
          );
        })}
      </div>

      {/* End button */}
      <button
        className="single-question-scrubber__nav-button"
        onClick={() => onNavigate(totalCount - 1)}
        disabled={currentIndex === totalCount - 1}
        aria-label="Go to last slide"
      >
        <IconSkipForward className="single-question-scrubber__icon" width={20} height={20} />
      </button>

      {/* Next button */}
      <button
        className="single-question-scrubber__nav-button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="Next slide"
      >
        <IconChevronRight className="single-question-scrubber__icon" width={20} height={20} />
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
