import React from "react";
import IconComplete from "../../assets/svg-icons/icon-check-circle.svg";
import IconIncomplete from "../../assets/svg-icons/icon-unfinished-check-circle.svg";

import "./summary-table.scss";

interface IProps {
  questionsStatus: Array<{number: number, prompt: string, answered: boolean}>;
}

export const SummaryTable: React.FC<IProps> = (props) => {
  const { questionsStatus } = props;

  return (
    <table>
      <thead>
        <tr>
          <th>Question</th>
          <th>Complete</th>
        </tr>
      </thead>
      <tbody>
      {questionsStatus.map((question: {number: number, prompt: string, answered: boolean}, index: number) => {
          const questionAnswered = question.answered ? <IconComplete /> : <IconIncomplete />;
          const questionPrompt = question.prompt.replace(/<\/?[^>]+(>|$)/g, "");
          return (
            <tr key={index}>
              <td>{question.number}) {questionPrompt}</td>
              <td>{questionAnswered}</td>
            </tr>
          );
        })
      }
      </tbody>
    </table>
  );
};
