import React from "react";

import "./managed-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class ManagedInteractive extends React.PureComponent<IProps>  {
  render () {
    const { embeddable, questionNumber } =this.props;
    return(
      <div className="question">
        <div className="header">Question #{questionNumber}</div>
        <div className="content">this is where managed interactive will go {embeddable.library_interactive.data.name}</div>
      </div>
    );
  }
}
