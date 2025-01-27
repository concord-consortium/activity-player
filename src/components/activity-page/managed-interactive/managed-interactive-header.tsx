import { DynamicText } from "@concord-consortium/dynamic-text";
import React from "react";
import IconQuestion from "../../../assets/svg-icons/icon-question.svg";

interface IProps {
  questionNumber?: number;
  questionName: string;
  hint: string;
  onToggleHint: () => void;
  hideHeader: boolean;
}

export const Header: React.FC<IProps> = ({ questionNumber, questionName, hint, onToggleHint, hideHeader }) => {
  if (hideHeader) return null;

  return (
    <div className="header">
      <DynamicText>
        {questionNumber && `Question #${questionNumber}`}
        {questionName.trim().length > 0 && questionNumber && ": "}
        {questionName}
      </DynamicText>
      {hint && (
        <div
          className="question-container"
          onClick={onToggleHint}
          data-cy="open-hint"
          tabIndex={0}
        >
          <IconQuestion className="question" height={22} width={22} />
        </div>
      )}
    </div>
  );
};
