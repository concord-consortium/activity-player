import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import IconComplete from "../../assets/svg-icons/icon-check-circle.svg";
import IconIncomplete from "../../assets/svg-icons/icon-unfinished-check-circle.svg";
import { renderHTML } from "../../utilities/render-html";
import { QuestionFeedback } from "../../types";
import { SummaryPageQuestionFeedback } from "../teacher-feedback/summary-page-question-feedback";
import { answersQuestionIdToRefId } from "../../utilities/embeddable-utils";
import { getPageHref } from "../../utilities/url-query";
import { LogEventName, Logger } from "../../lib/logger";

import "./summary-table.scss";

export interface IQuestionStatus {
  embeddableId?: string;
  number: number;
  page: number;
  pageId: number | null;
  prompt: string;
  answered: boolean;
  feedback?: QuestionFeedback;
}

interface IProps {
  questionsStatus: Array<IQuestionStatus>;
  onPageChange: (page: number, embeddableId?: string) => void;
}

export const SummaryTable: React.FC<IProps> = (props) => {
  const { questionsStatus, onPageChange } = props;

  const handleQuestionLinkClick = (page: number, refId?: string) => (e: React.MouseEvent) => {
    // Let the browser handle modified clicks (e.g. cmd/ctrl-click to open the
    // question's page in a new tab) natively via the anchor's href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    onPageChange(page, refId);
    Logger.log({
      event: LogEventName.click_summary_page_question_link,
      parameters: { target_question: refId }
    });
  };

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
        const refId = question.embeddableId && answersQuestionIdToRefId(question.embeddableId);
          const questionAnswered = question.answered
            ? <IconComplete className="complete" role="img" aria-label="Complete" focusable="false" />
            : <IconIncomplete className="incomplete" role="img" aria-label="Incomplete" focusable="false" />;
          // Remove all the HTML tags to avoid unnecessary formatting and whitespace in the summary table.
          // `renderHTML()` is still necessary to render encoded characters like &quot; => ", etc.
          const questionPrompt = question.prompt ? renderHTML(question.prompt.replace(/<\/?[^>]+(>|$)/g, "")) : "";
          return (
            <tr key={index} data-cy="summary-table-row">
              <td>
                <div className="question-meta">
                  <div className="question-page-and-number" data-testid="question-page-and-number">
                    <a
                      href={getPageHref(question.pageId)}
                      onClick={handleQuestionLinkClick(question.page, refId)}
                      data-testid="question-link"
                    >
                      <DynamicText>Page {question.page}: Question {question.number}.</DynamicText>
                    </a>
                  </div>
                  <div className="question-prompt" data-testid="question-prompt">
                    {questionPrompt && <DynamicText><em>{questionPrompt}</em></DynamicText>}
                    {question.feedback && (
                      <div className={questionPrompt ? "question-feedback" : "question-feedback no-prompt"}>
                        <SummaryPageQuestionFeedback teacherFeedback={question.feedback} />
                      </div>)}
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
