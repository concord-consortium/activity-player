import React from "react";
import classNames from "classnames";
import { ActivityFeedback } from "../../types";
import { RubricComponent } from "./rubric";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./activity-level-feedback-banner.scss";

interface IProps {
  teacherFeedback: ActivityFeedback;
}

export const ActivityLevelFeedbackBanner = ({ teacherFeedback }: IProps) => {
  const hasRubric = !!teacherFeedback.feedbackSettings?.rubric;
  const bannerClass = classNames("activity-level-feedback-banner", {
    "has-rubric": hasRubric
  });

  return (
    <div className={bannerClass} data-testid="activity-level-feedback-banner">
      <TeacherFeedbackIcon className="teacher-feedback-icon" />
      {hasRubric && <div className="activity-level-feedback-title"><strong>Overall Teacher Feedback for This Activity:</strong> </div>}
      <div className="activity-level-feedback-content" data-testid="activity-level-feedback-content">
        {hasRubric
          ? <RubricComponent teacherFeedback={teacherFeedback} />
          : <><strong>Overall Teacher Feedback for This Activity:</strong> {teacherFeedback.content}</>}
      </div>
    </div>
  );
};
