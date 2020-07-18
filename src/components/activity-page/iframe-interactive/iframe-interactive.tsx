import React from "react";

import "./iframe-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class IframeInteractiveQuestion extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, questionNumber } = this.props;
    return(
      <div className="iframe-interactive-question" data-cy="iframe-interactive-question">
        { questionNumber && <div className="iframe-interactive-question-header">Question #{questionNumber}</div> }
        <iframe className="iframe-interactive-question-content" src={embeddable.url}></iframe>
      </div>
    );
  }
}
