import React from "react";
import { Embeddable } from "./embeddable";

import "./primary-embeddable.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export const PrimaryEmbeddable: React.FC<IProps> = (props) => {
  return (
    <div className="primary-embeddable" data-cy="primary-embeddable">
      <Embeddable
        embeddable={props.embeddable}
        isPageIntroduction={false}
        questionNumber={props.questionNumber}
      />
    </div>
  );
};
