import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text/component";

import { renderHTML } from "../../../utilities/render-html";
import { IEmbeddableXhtml } from "../../../types";

// this is imported and passed as the context due to the multiple forward refs wrapping
// this component causing the component not to re-render with the non-default provider value
import { dynamicTextManager } from "../../app";

import "./text-box.scss";

interface IProps {
  embeddable: IEmbeddableXhtml;
}

export const TextBox: React.FC<IProps> = (props) => {
  const { embeddable} = props;
  return(
    <div className={`textbox ${embeddable.is_callout ? "callout" : ""}`} data-cy="text-box">
      { embeddable.name && <div className="text-name"><DynamicText context={dynamicTextManager}>{embeddable.name}</DynamicText></div> }
      <div className="content">
        <DynamicText context={dynamicTextManager}>
          <div className="question-txt">
            {embeddable.content &&  renderHTML(embeddable.content)}
          </div>
        </DynamicText>
      </div>
    </div>
  );
};
