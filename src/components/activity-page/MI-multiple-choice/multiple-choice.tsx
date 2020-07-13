import React from "react";
import { renderHTML } from "../../../utilities/render-html";

import "./multiple-choice.scss";

interface IProps {
  embeddable: any;
  questionNumber?: number;
}

export class MultipleChoiceQuestion extends React.PureComponent<IProps>  {
  render() {
    const { embeddable, questionNumber } = this.props;
    const choices = embeddable.choices;
    const choicesClass = "choice-container " + embeddable.layout;
    const inputType = embeddable.multipleAnswer ? "checkbox" : "radio";

    return (
      <div className="question" data-cy="multiple-choice-question">
        <div className="header">Question #{questionNumber}</div>
        <div className="content">{renderHTML(embeddable.prompt)}
          <fieldset className="options">
            <div className={choicesClass}>
              {
                choices.map((choice: any, i: number) => {
                  return (
                    <div className="choice" key={i}>
                      <input type={inputType} name={choices.id} value={choice.content}/>
                      <label>{choice.content}</label>
                    </div>
                  );
                })
              }
            </div>
          </fieldset>
        </div>
      </div>
    );
  }
}
