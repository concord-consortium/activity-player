import React from "react";
import { TextBox } from "./text-box/text-box";
import { IframeInteractiveQuestion } from "./iframe-interactive/iframe-interactive";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";

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
      {renderEmbeddable(props.embeddable, props.questionNumber)}
    </div>
  );

  function renderEmbeddable (embeddable: any, questionNumber: number) {
    const EmbeddableComponent: any = {
      "MwInteractive": IframeInteractiveQuestion,
      "ManagedInteractive": ManagedInteractive,
      "Embeddable::Xhtml": TextBox,
    };
    const type  = embeddable.embeddable.type;
    const QComponent = embeddable ? EmbeddableComponent[type] : undefined;

    if (!QComponent) {
      return (
        <div>Content type not supported</div>
      );
    }
    else {
      return (
        <QComponent embeddable={embeddable.embeddable} questionNumber={questionNumber} />
      );
    }
  }
};
