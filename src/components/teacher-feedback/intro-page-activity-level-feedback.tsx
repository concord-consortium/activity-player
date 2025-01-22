import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { TeacherFeedback } from "../../types";
import { ActivityLevelFeedbackBanner } from "./activity-level-feedback-banner";

import "./intro-page-activity-level-feedback.scss";

interface IProps {
  teacherFeedback: TeacherFeedback;
}

export const IntroPageActivityLevelFeedback = ({ teacherFeedback }: IProps) => {
  return (
    <div className="intro-page-activity-level-feedback" data-testid="intro-page-activity-level-feedback">
      <h1><DynamicText>Teacher Feedback</DynamicText></h1>
      <ActivityLevelFeedbackBanner teacherFeedback={teacherFeedback} />
    </div>
  );
};
