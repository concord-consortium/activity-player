import React from "react";
import { renderHTML } from "../../../utilities/render-html";
import { IEmbeddableXhtml } from "../../../types";

import "./text-box.scss";

interface IProps {
  embeddable: IEmbeddableXhtml;
}

export const TextBox: React.FC<IProps> = (props) => {
  const { embeddable} = props;
  return(
    <div className={`textbox ${embeddable.is_callout ? "callout" : ""}`} data-cy="text-box">
      { embeddable.name && <div className="text-name">{embeddable.name}</div> }
      <div className="content">
        {embeddable.content && renderHTML(embeddable.content)}
      </div>
    </div>
  );
};
