import React from "react";
import { ActivityFeedback } from "../../types";
import { RubricComponent } from "./rubric";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./activity-level-feedback-banner.scss";

interface IProps {
  teacherFeedback: ActivityFeedback;
}

export const ActivityLevelFeedbackBanner = ({ teacherFeedback }: IProps) => {
  const hasRubric = !!teacherFeedback.feedbackSettings?.rubric;

  return (
    <div className="activity-level-feedback-banner" data-testid="activity-level-feedback-banner">
      <TeacherFeedbackIcon className="teacher-feedback-icon" />
      <div className="activity-level-feedback-title" data-testid="activity-level-feedback-title">
        <strong>Overall Teacher Feedback for This Activity:</strong>
      </div>
      <div className="activity-level-feedback-content" data-testid="activity-level-feedback-content">
        {hasRubric ? <RubricComponent teacherFeedback={teacherFeedback} /> : teacherFeedback.content}
      </div>
    </div>
  );
};
