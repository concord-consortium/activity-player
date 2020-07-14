import React from "react";

import "./managed-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class ManagedInteractive extends React.PureComponent<IProps>  {
  render() {
    return (
      <div>
        <div className="header">Question #{this.props.questionNumber}</div>
        <div>Managed Interactive</div>
      </div>
    );
  }
}
