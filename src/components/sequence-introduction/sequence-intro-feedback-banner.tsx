import React from "react";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./sequence-intro-feedback-banner.scss";

export const SequenceIntroFeedbackBanner = () => {
  return (
    <div data-cy="intro-feedback-banner" className="intro-feedback-banner">
      <TeacherFeedbackIcon className="teacher-feedback-icon" />
      Your teacher has provided feedback.
    </div>
  );
};
