import { DynamicText } from "@concord-consortium/dynamic-text";
import React from "react";
import { renderHTML } from "../../../utilities/render-html";
import IconArrowUp from "../../../assets/svg-icons/icon-arrow-up.svg";

interface IProps {
  hint: string;
  showHint: boolean;
  onToggleHint: () => void;
}

export const ManagedInteractiveHint: React.FC<IProps> = ({hint, showHint, onToggleHint}) => {
  if (!hint) return null;

  return (
    <div className={`hint-container ${showHint ? "" : "collapsed"}`}>
      <DynamicText>
        <div className="hint question-txt" data-cy="hint">
          {renderHTML(hint)}
        </div>
      </DynamicText>
      <div className="close-container">
        <IconArrowUp
          className={"close"}
          width={26}
          height={26}
          onClick={onToggleHint}
          onKeyDown={onToggleHint}
          data-cy="close-hint"
          tabIndex={0}
        />
      </div>
    </div>
  );
};
