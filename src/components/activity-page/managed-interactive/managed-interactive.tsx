import React from "react";
import { OpenResponseQuestion } from "../open-response/open-response";
import { MultipleChoiceQuestion } from "../MI-multiple-choice/multiple-choice";
import { LabbookQuestion } from "../labbook-question/labbook";
import { ImageQuestion } from "../image-question/image-question";
import { ImageVideoInteractive } from "../image-video-interactive/image-video-interactive";
import { GenericInteractive } from "../generic-interactive/generic-interactive";


import "./managed-interactive.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class ManagedInteractive extends React.PureComponent<IProps>  {

  render () {
    const ManagedInteractiveComponent: any = {
      "open_response": OpenResponseQuestion,
      "image_question": ImageQuestion,
      "multiple_choice": MultipleChoiceQuestion,
      "image_interact": ImageVideoInteractive,
      "video_interactive": ImageVideoInteractive,
      "labbook": LabbookQuestion,
      "generic": GenericInteractive
    };
    const { embeddable, questionNumber } =this.props;
    const authoredState = embeddable.authored_state && JSON.parse(embeddable.authored_state);
    const type  = authoredState ? authoredState.questionType : "generic";
    const MIComponent = type ? ManagedInteractiveComponent[type] : undefined;

    if (!MIComponent) {
      return (
        <div>Managed Interactive type not supported.</div>
      );
    } 
    else {
      return (
        <MIComponent embeddable={authoredState ? authoredState : embeddable} questionNumber={questionNumber} />
      );
    }
  }
}
