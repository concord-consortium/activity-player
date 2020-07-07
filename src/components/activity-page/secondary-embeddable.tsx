import React from "react";
import { TextBox } from "./text-box/text-box";
import { OpenResponseQuestion } from "./open-response/open-response";
import { MultipleChoiceQuestion } from "./multiple-choice/multiple-choice";
import { LabbookQuestion } from "./labbook-question/labbook";
import { IframeInteractiveQuestion } from './iframe-interactive/iframe-interactive';
import { ImageQuestion } from "./image-question/image-question";
import { ImageVideoInteractive } from "./image-video-interactive/image-video-interactive";
import { ManagedInteractive } from "./managed-interactive/managed-interactive";

import "./secondary-embeddable.scss";

interface IProps {
  embeddable: any;
  questionNumber: number;
}

export const SecondaryEmbeddable: React.FC<IProps> = (props) => {
  return (
    <div className="secondary-embeddable" data-cy="secondary-embeddable">
      {renderEmbeddable(props.embeddable, props.questionNumber)}
    </div>
  );

  function renderEmbeddable (embeddable: any, questionNumber: number) {
    const EmbeddableComponent: any = {
      "Embeddable::OpenResponse": OpenResponseQuestion,
      "MwInteractive": IframeInteractiveQuestion,
      "Embeddable::Xhtml": TextBox,
      "Embeddable::ImageQuestion": ImageQuestion,
      "Embeddable::MultipleChoice": MultipleChoiceQuestion,
      "ImageInteractive": ImageVideoInteractive,
      "VideoInteractive": ImageVideoInteractive,
      "Embeddable::Labbook": LabbookQuestion,
      "ManagedInteractive": ManagedInteractive
    };
    const type  = props.embeddable.embeddable.type;

    const QComponent = embeddable ? EmbeddableComponent[type] : undefined;

    if (!QComponent) {
      return (
        <div>Question type not supported.</div>
      );
    }
    else {
      return (
        <QComponent embeddable={embeddable.embeddable} questionNum={questionNumber} />
      );
    }
  }
};
