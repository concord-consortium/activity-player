import React from "react";
import { TeacherFeedback } from "../../types";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./activity-level-feedback-banner.scss";

interface IProps {
  teacherFeedback: TeacherFeedback;
}

export const ActivityLevelFeedbackBanner = ({ teacherFeedback }: IProps) => {
  return (
    <div className="activity-level-feedback-banner" data-testid="activity-level-feedback-banner">
      <TeacherFeedbackIcon className="teacher-feedback-icon" />
      <div className="activity-level-feedback-content" data-testid="activity-level-feedback-content">
        <strong>Overall Teacher Feedback for This Activity:</strong> {teacherFeedback.content}
      </div>
    </div>
  );
};
