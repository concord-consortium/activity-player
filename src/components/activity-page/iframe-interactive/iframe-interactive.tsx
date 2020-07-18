import React from "react";

import "./iframe-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class IframeInteractiveQuestion extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, questionNumber } = this.props;
    console.log(questionNumber);
    return(
      <div className="iframe-interactive" data-cy="iframe-interactive-question">
        { questionNumber && <div className="iframe-interactive-header">Question #{questionNumber}</div> }
        <iframe className={`iframe-interactive-content ${questionNumber ? "vertical-offset" : ""}`} src={embeddable.url}></iframe>
      </div>
    );
  }
}
