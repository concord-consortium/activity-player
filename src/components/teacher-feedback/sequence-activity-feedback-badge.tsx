import React from "react";
import TeacherFeedbackBadge from "../../assets/svg-icons/teacher-feedback-badge.svg";

import "./sequence-activity-feedback-badge.scss";

export const FeedbackBadge = () => {
  return (
    <TeacherFeedbackBadge className="feedback-badge" role="img" aria-label="Your teacher left feedback on this activity." focusable="false" />
  );
};
