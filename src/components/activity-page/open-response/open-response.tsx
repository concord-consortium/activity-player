import React from "react";
import { renderHTML } from "../../../utilities/render-html";

import "./open-response.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class OpenResponseQuestion extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, questionNumber } =this.props;
    return(
      <div className="question">
        <div className="header">Question #{questionNumber}</div>
        <div className="content">{renderHTML(embeddable.prompt)}</div>
      </div>
    );
  }
}
