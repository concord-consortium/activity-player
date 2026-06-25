import { DynamicText } from "@concord-consortium/dynamic-text";
import React from "react";
import IconQuestion from "../../../assets/svg-icons/icon-question.svg";

interface IProps {
  questionNumber?: number;
  questionName: string;
  hint: string;
  showHint: boolean;
  hintPanelId: string;
  triggerRef?: React.Ref<HTMLButtonElement>;
  onToggleHint: () => void;
  hideHeader: boolean;
}

export const ManagedInteractiveHeader: React.FC<IProps> = ({ questionNumber, questionName, hint, showHint, hintPanelId, triggerRef, onToggleHint, hideHeader }) => {
  if (hideHeader) return null;

  const trimmedQuestionName = questionName.trim();

  return (
    <div className="header">
      <DynamicText>
        {questionNumber && `Question #${questionNumber}`}
        {trimmedQuestionName.length > 0 && questionNumber && ": "}
        {questionName}
      </DynamicText>
      {hint && (
        <button
          ref={triggerRef}
          type="button"
          className="question-container"
          onClick={onToggleHint}
          data-cy="open-hint"
          aria-label={trimmedQuestionName ? `Hint for ${trimmedQuestionName}` : "Show hint"}
          aria-expanded={showHint}
          aria-controls={hintPanelId}
        >
          <IconQuestion className="question" height={22} width={22} aria-hidden="true" focusable="false" />
        </button>
      )}
    </div>
  );
};
