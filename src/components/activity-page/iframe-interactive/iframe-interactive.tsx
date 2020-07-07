import React from "react";

import "./iframe-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class IframeInteractiveQuestion extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, questionNumber } =this.props;
    return(
      <div className="question">
        <div className="header">Question #{questionNumber}</div>
        <iframe className="content" src={embeddable.url}></iframe>
      </div>
    );
  }
}
