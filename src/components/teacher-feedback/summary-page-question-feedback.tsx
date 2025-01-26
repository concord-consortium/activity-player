import React from "react";
import { QuestionFeedback } from "../../types";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./summary-page-question-feedback.scss";

interface IProps {
  teacherFeedback: QuestionFeedback;
}

export const SummaryPageQuestionFeedback = ({ teacherFeedback }: IProps) => {
  return (
    <div className="summary-page-question-feedback" data-testid="summary-page-question-feedback">
      <TeacherFeedbackIcon className="teacher-feedback-icon" />
      <div className="summary-page-question-feedback-content" data-testid="summary-page-question-feedback-content">
        <strong>Teacher Feedback:</strong> {teacherFeedback.content}
      </div>
    </div>
  );
};
