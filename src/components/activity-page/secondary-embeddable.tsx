import React from "react";

import './secondary-embeddable.scss';

interface IProps {
  embeddable: any;
  questionNumber: number;
}

export const SecondaryEmbeddable: React.SFC<IProps> = (props) => {
  return (
    <div className="secondary-embeddable">
      <div className="header">{`Question #${props.questionNumber}`}</div>
      <div className="content" />
    </div>
  );
};
