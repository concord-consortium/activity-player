// src/components/single-question/slides/single-question-sequence-landing.tsx

import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { Sequence } from "../../../types";
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
