import React from "react";
import { Embeddable } from "./embeddable";

import "./secondary-embeddable.scss";

interface IProps {
  embeddable: any;
  questionNumber: number;
  isFullWidth: boolean;
}

export const SecondaryEmbeddable: React.FC<IProps> = (props) => {
  const secondaryEmbeddableClass = props.isFullWidth ? "secondary-embeddable full" : "secondary-embeddable";
  return (
    <div className={secondaryEmbeddableClass} data-cy="secondary-embeddable">
      <Embeddable
        embeddable={props.embeddable}
        questionNumber={props.questionNumber}
        isIntroduction={false}
      />
    </div>
  );
};
