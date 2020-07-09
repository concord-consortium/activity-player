import React from "react";

import "./secondary-embeddable.scss";

interface IProps {
  embeddable: any;
  questionNumber: number;
}

export const SecondaryEmbeddable: React.FC<IProps> = (props) => {
  return (
    <div className="secondary-embeddable" data-cy="secondary-embeddable">
      <div className="header" data-cy="secondary-embeddable-header">{`Question #${props.questionNumber}`}</div>
      <div className="content" />
    </div>
  );
};
