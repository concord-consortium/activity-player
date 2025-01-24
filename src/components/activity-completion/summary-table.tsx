import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import IconComplete from "../../assets/svg-icons/icon-check-circle.svg";
import IconIncomplete from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import { renderHTML } from "../../utilities/render-html";
import { QuestionFeedback } from "../../types";
import { SummaryPageQuestionFeedback } from "../teacher-feedback/summary-page-question-feedback";

import "./summary-table.scss";

export interface IQuestionStatus {
  number: number;
  page: number;
  prompt: string;
  answered: boolean;
  feedback?: QuestionFeedback;
}

interface IProps {
  questionsStatus: Array<IQuestionStatus>;
}

export const SummaryTable: React.FC<IProps> = (props) => {
  const { questionsStatus } = props;

  return (
    <table className="summary-table" data-cy="summary-table">
      <thead>
        <tr>
          <th><DynamicText>Question</DynamicText></th>
          <th><DynamicText>Complete</DynamicText></th>
        </tr>
      </thead>
      <tbody>
      {questionsStatus.map((question: IQuestionStatus, index) => {
          const questionAnswered = question.answered ? <IconComplete className="complete" /> : <IconIncomplete className="incomplete" />;
          // Remove all the HTML tags to avoid unnecessary formatting and whitespace in the summary table.
          // `renderHTML()` is still necessary to render encoded characters like &quot; => ", etc.
          const questionPrompt = question.prompt ? renderHTML(question.prompt.replace(/<\/?[^>]+(>|$)/g, "")) : "";
          return (
            <tr key={index} data-cy="summary-table-row">
              <td>
                <div className="question-meta">
                  <div className="question-page-and-number" data-testid="question-meta">
                    <DynamicText>Page {question.page}: Question {question.number}.</DynamicText>
                  </div>
                  <div className="question-prompt" data-testid="question-prompt">
                    <DynamicText><em>{questionPrompt}</em></DynamicText>
                    {question.feedback && <SummaryPageQuestionFeedback teacherFeedback={question.feedback} />}
                  </div>
                </div>
              </td>
              <td>{questionAnswered}</td>
            </tr>
          );
        })
      }
      </tbody>
    </table>
  );
};
