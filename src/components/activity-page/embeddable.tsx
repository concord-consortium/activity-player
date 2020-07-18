import React from "react";
import { TextBox } from "./text-box/text-box";
import { IframeInteractiveQuestion } from "./iframe-interactive/iframe-interactive";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";

interface IProps {
  embeddable: any;
  isPageIntroduction: boolean;
  questionNumber?: number;
}

export const Embeddable: React.FC<IProps> = (props) => {
  const { embeddable, isPageIntroduction, questionNumber } = props;
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
        ? <QComponent embeddable={embeddable.embeddable} questionNumber={questionNumber} isPageIntroduction={isPageIntroduction} />
        : <div>Content type not supported</div>
      }
    </React.Fragment>
  );
};
