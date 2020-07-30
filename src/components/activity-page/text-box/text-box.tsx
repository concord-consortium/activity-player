import React from "react";
import { renderHTML } from "../../../utilities/render-html";

import "./text-box.scss";
import { EmbeddableXhtmlInteractive } from "../../../types";

interface IProps {
  embeddable: EmbeddableXhtmlInteractive;
  isPageIntroduction: boolean;
}

export class TextBox extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, isPageIntroduction } = this.props;
    return(
      <div className="textbox" data-cy="text-box">
        { embeddable.name && !isPageIntroduction && <div className="text-name">{embeddable.name}</div> }
        <div className={!isPageIntroduction ? "content" : ""}>
          {embeddable.content && renderHTML(embeddable.content)}
        </div>
      </div>
    );
  }
}
