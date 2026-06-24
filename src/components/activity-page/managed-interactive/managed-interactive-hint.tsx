import { DynamicText } from "@concord-consortium/dynamic-text";
import React from "react";
import { renderHTML } from "../../../utilities/render-html";
import IconArrowUp from "../../../assets/svg-icons/icon-arrow-up.svg";

interface IProps {
  hint: string;
  showHint: boolean;
  panelId: string;
  questionName: string;
  onToggleHint: () => void;
}

export const ManagedInteractiveHint: React.FC<IProps> = ({hint, showHint, panelId, questionName, onToggleHint}) => {
  if (!hint) return null;

  const trimmedQuestionName = questionName.trim();

  return (
    <div id={panelId} className={`hint-container ${showHint ? "" : "collapsed"}`}>
      <DynamicText>
        <div className="hint question-txt" data-cy="hint">
          {renderHTML(hint)}
        </div>
      </DynamicText>
      <div className="close-container">
        <button
          type="button"
          className="close-button"
          onClick={onToggleHint}
          data-cy="close-hint"
          aria-label={trimmedQuestionName ? `Hide hint for ${trimmedQuestionName}` : "Hide hint"}
        >
          <IconArrowUp className="close" width={26} height={26} aria-hidden="true" focusable="false" />
        </button>
      </div>
    </div>
  );
};
