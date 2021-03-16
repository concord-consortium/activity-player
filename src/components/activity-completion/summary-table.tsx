import React from "react";
import IconComplete from "../../assets/svg-icons/icon-check-circle.svg";
import IconIncomplete from "../../assets/svg-icons/icon-unfinished-check-circle.svg";

import "./summary-table.scss";

interface IProps {
  questionsStatus: Array<{number: number, page: number, prompt: string, answered: boolean}>;
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
      {questionsStatus.map((question: {number: number, page: number, prompt: string, answered: boolean}, index) => {
          const questionAnswered = question.answered ? <IconComplete className="complete" /> : <IconIncomplete className="incomplete" />;
          const questionPrompt = question.prompt ? question.prompt.replace(/<\/?[^>]+(>|$)/g, "") : "";
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
