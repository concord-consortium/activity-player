import React from "react";
import { Embeddable } from "./embeddable";

import "./introduction-embeddable.scss";

interface IProps {
  embeddable: any;
  isPageIntroduction: boolean;
  questionNumber: number;
}

export const IntroductionEmbeddable: React.FC<IProps> = (props) => {
  const reducedWidth = !props.embeddable.embeddable.is_full_width;
  return (
    <div className={`introduction-embeddable ${reducedWidth ? "reduced-width" : ""}`} data-cy="introduction-embeddable">
      <Embeddable
        embeddable={props.embeddable}
        isPageIntroduction={props.isPageIntroduction}
        questionNumber={props.questionNumber}
      />
    </div>
  );
};
