import React from "react";
import IconComplete from "../../assets/svg-icons/icon-check-circle.svg";
import IconIncomplete from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import { renderHTML } from "../../utilities/render-html";

import "./summary-table.scss";

export interface IQuestionStatus {
  number: number;
  page: number;
  prompt: string;
  answered: boolean;
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
          <th>Question</th>
          <th>Complete</th>
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
              <td>Page {question.page}: Question {question.number}. <em>{questionPrompt}</em></td>
              <td>{questionAnswered}</td>
            </tr>
          );
        })
      }
      </tbody>
    </table>
  );
};
