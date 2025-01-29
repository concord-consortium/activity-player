import React from "react";
import { ActivityFeedback } from "../../types";
import { Rubric } from "./rubric";
import { RubricContext, useRubricValue } from "../../hooks/use-rubric";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./activity-level-feedback-banner.scss";

interface IProps {
  teacherFeedback: ActivityFeedback;
}

export const ActivityLevelFeedbackBanner = ({ teacherFeedback }: IProps) => {
  const authoredContentUrl = "https://cc-project-resources.s3.amazonaws.com/lara-authored-content/staging/rubrics/25/11"; // this is probably wrong
  const rubricContextValue = useRubricValue(authoredContentUrl);
  const scored = true;

  return (
    <RubricContext.Provider value={rubricContextValue}>
      <div className="activity-level-feedback-banner" data-testid="activity-level-feedback-banner">
        <TeacherFeedbackIcon className="teacher-feedback-icon" />
        <div className="activity-level-feedback-title" data-testid="activity-level-feedback-title">
          <strong>Overall Teacher Feedback for This Activity:</strong>
        </div>
        <div className="activity-level-feedback-content" data-testid="activity-level-feedback-content">
          {scored && <Rubric scored={scored} teacherFeedback={teacherFeedback} />}
          {!scored && teacherFeedback.content}
        </div>
      </div>
    </RubricContext.Provider>
  );
};
