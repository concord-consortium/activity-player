import React from "react";
import { TeacherFeedback } from "../../types";
import { DynamicText } from "@concord-consortium/dynamic-text";

import "./activity-level-feedback.scss";

interface IProps {
  teacherFeedback: TeacherFeedback;
}

export const ActivityLevelFeedback = ({ teacherFeedback }: IProps) => {
  return (
    <div className="activity-level-feedback" data-cy="activity-level-feedback">
      <h1><DynamicText>Teacher Feedback</DynamicText></h1>
      <div className="teacher-feedback" data-cy="teacher-feedback">
        <strong>Overall Teacher Feedback for This Activity:</strong> {teacherFeedback.feedback}
      </div>
    </div>
  );
};
