import React from "react";
import { renderHTML } from "../../../utilities/render-html";

import "./labbook.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class LabbookQuestion extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, questionNumber } =this.props;
    return(
      <div className="question" data-cy="labbook-question">
        <div className="header">Question #{questionNumber}</div>
        <div className="content">{renderHTML(embeddable.prompt)}</div>
      </div>
    );
  }
}
