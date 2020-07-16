import React from "react";
import { TextBox } from "./text-box/text-box";
import { IframeInteractiveQuestion } from "./iframe-interactive/iframe-interactive";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";

import "./embeddable.scss";

interface IProps {
  embeddable: any;
  isIntroduction: boolean;
  questionNumber: number;
}

export const Embeddable: React.FC<IProps> = (props) => {
  const { embeddable, isIntroduction, questionNumber } = props;
  const EmbeddableComponent: any = {
    "MwInteractive": IframeInteractiveQuestion,
    "ManagedInteractive": ManagedInteractive,
    "Embeddable::Xhtml": TextBox,
  };
  const type = embeddable.embeddable.type;
  const QComponent = embeddable ? EmbeddableComponent[type] : undefined;
  return (
    <React.Fragment>
      { QComponent
        ? <QComponent embeddable={embeddable.embeddable} questionNumber={questionNumber} isIntroduction={isIntroduction} />
        : <div>Content type not supported</div>
      }
    </React.Fragment>
  );
};
