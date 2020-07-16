import React from "react";

import "./iframe-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class IframeInteractiveQuestion extends React.PureComponent<IProps>  {
  render () {
    const { embeddable } = this.props;
    return(
      <div className="question" data-cy="iframe-interactive-question">
        <iframe className="content" src={embeddable.url}></iframe>
      </div>
    );
  }
}
