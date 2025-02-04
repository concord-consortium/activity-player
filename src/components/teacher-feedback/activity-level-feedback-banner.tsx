import React from "react";
import classNames from "classnames";
import { DynamicText } from "@concord-consortium/dynamic-text";
import { ActivityFeedback } from "../../types";
import { RubricComponent } from "./rubric";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./activity-level-feedback-banner.scss";

interface IProps {
  teacherFeedback: ActivityFeedback;
}

export const ActivityLevelFeedbackBanner = ({ teacherFeedback }: IProps) => {
  const { rubric } = teacherFeedback.feedbackSettings ?? {};
  const shouldRenderRubric = !!rubric && !rubric.hideRubricFromStudentsInStudentReport;
  const bannerClass = classNames("activity-level-feedback-banner", {
    "has-rubric": shouldRenderRubric
  });

  return (
    <div className={bannerClass} data-testid="activity-level-feedback-banner">
      <TeacherFeedbackIcon className="teacher-feedback-icon" />
      {shouldRenderRubric && (
        <div className="activity-level-feedback-title">
          <DynamicText><strong>Overall Teacher Feedback for This Activity:</strong></DynamicText>
        </div>
      )}
      <div className="activity-level-feedback-content" data-testid="activity-level-feedback-content">
        {shouldRenderRubric ? (
          <RubricComponent teacherFeedback={teacherFeedback} />
        ) : (
          <DynamicText><strong>Overall Teacher Feedback for This Activity:</strong> {teacherFeedback.content}</DynamicText>
        )}
      </div>
    </div>
  );
};
