import React from "react";
import { renderHTML } from "../../../utilities/render-html";
import { IEmbeddableXhtml } from "../../../types";
import { ReadAloudText } from "../../../lib/read-aloud-code-to-refactor";

import "./text-box.scss";

interface IProps {
  embeddable: IEmbeddableXhtml;
}

export const TextBox: React.FC<IProps> = (props) => {
  const { embeddable} = props;
  return(
    <div className={`textbox ${embeddable.is_callout ? "callout" : ""}`} data-cy="text-box">
      { embeddable.name && <div className="text-name"><ReadAloudText>{embeddable.name}</ReadAloudText></div> }
      <div className="content question-txt">
        {embeddable.content && <ReadAloudText>{renderHTML(embeddable.content)}</ReadAloudText>}
      </div>
    </div>
  );
};
