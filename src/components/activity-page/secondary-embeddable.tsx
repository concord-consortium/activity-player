import React from "react";
import { Embeddable } from "./embeddable";

import "./secondary-embeddable.scss";

interface IProps {
  embeddable: any;
  isFullWidth: boolean;
  questionNumber?: number;
}

export const SecondaryEmbeddable: React.FC<IProps> = (props) => {
  const secondaryEmbeddableClass = props.isFullWidth ? "secondary-embeddable full" : "secondary-embeddable";
  return (
    <div className={secondaryEmbeddableClass} data-cy="secondary-embeddable">
      <Embeddable
        embeddable={props.embeddable}
        isPageIntroduction={false}
        questionNumber={props.questionNumber}
      />
    </div>
  );
};
