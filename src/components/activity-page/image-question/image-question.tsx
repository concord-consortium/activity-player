import React from "react";
import { renderHTML } from "../../../utilities/render-html";

import "./image-question.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class ImageQuestion extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, questionNumber } =this.props;
    return(
      <div className="question" data-cy="image-question">
        <div className="header">Question #{questionNumber}</div>
        <div className="content">{renderHTML(embeddable.prompt)}</div>
      </div>
    );
  }
}
