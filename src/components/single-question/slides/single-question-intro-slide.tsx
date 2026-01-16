// src/components/single-question/slides/single-question-intro-slide.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { ActivitySummary } from "../../activity-introduction/activity-summary";
import IconArrowRight from "../../../assets/svg-icons/icon-arrow-right.svg";
import "./single-question-intro-slide.scss";

interface IProps {
  activityName: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  estimatedTime?: number | null;
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
        introText={description ?? null}
        time={estimatedTime ?? null}
        imageUrl={thumbnailUrl ?? null}
      />
      <button
        className="single-question-intro-slide__start-button"
        onClick={onStart}
        aria-label="Start activity"
      >
        <DynamicText>Start</DynamicText>
        <IconArrowRight className="single-question-intro-slide__start-icon" width={20} height={20} aria-hidden="true" />
      </button>
      <p className="single-question-intro-slide__keyboard-hint">
        <DynamicText>You can also use arrow keys to navigate</DynamicText>
      </p>
    </div>
  );
};
