import { DynamicText } from "@concord-consortium/dynamic-text";
import React from "react";
import { QuestionFeedback } from "../../types";
import { LogEventName, Logger } from "../../lib/logger";
import TeacherFeedbackIcon from "../../assets/svg-icons/teacher-feedback-icon.svg";

import "./interactive-feedback.scss";

interface IProps {
  feedback: QuestionFeedback;
  embeddableRefId: string;
}

export const InteractiveFeedback: React.FC<IProps> = ({feedback, embeddableRefId}) => {
  const [showFeedback, setShowFeedback] = React.useState(false);

  React.useEffect(() => {
    // when teacher updates feedback, show button again
    setShowFeedback(false);
  }, [feedback.content]);

  const handleShowFeedback = () => {
    Logger.log({
      event: LogEventName.click_show_feedback_button,
      parameters: { target_question: embeddableRefId }
    });

    setShowFeedback(true);
  };

  return (
    showFeedback ?
    <div className="teacher-feedback">
      <div>
        <TeacherFeedbackIcon/>
      </div>
      <DynamicText>
          <strong>Teacher Feedback:</strong> {feedback.content}
      </DynamicText>
    </div> :
    <button className="feedback-button" onClick={handleShowFeedback}>
      <div className="feedback-button-content">
        <div className="button-icon">
          <TeacherFeedbackIcon/>
        </div>
        <div className="feedback-button-text">
          <DynamicText>
              Show Teacher Feedback
          </DynamicText>
        </div>
      </div>
    </button>
  );
};
