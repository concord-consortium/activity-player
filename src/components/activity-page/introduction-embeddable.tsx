import React from "react";
import { Embeddable } from "./embeddable";

import "./introduction-embeddable.scss";

interface IProps {
  embeddable: any;
  questionNumber: number;
}

export const IntroductionEmbeddable: React.FC<IProps> = (props) => {
  return (
    <div className="introduction-embeddable" data-cy="introduction-embeddable">
      <Embeddable
        embeddable={props.embeddable}
        questionNumber={props.questionNumber}
        isIntroduction={true}
      />
    </div>
  );
};
