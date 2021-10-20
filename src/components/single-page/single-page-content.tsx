import React from "react";
import { numQuestionsOnPreviousSections, numQuestionsOnPreviousPages } from "../../utilities/activity-utils";
import { RelatedContent } from "./related-content";
import { SubmitButton } from "./submit-button";

import "./single-page-content.scss";
import { Activity, Page } from "../../types";
import { Section } from "../activity-page/section";

interface IProps {
  activity: Activity;
  teacherEditionMode?: boolean;
  pluginsLoaded: boolean;
}

export const SinglePageContent: React.FC<IProps> = (props) => {
  const { activity } = props;
  const renderPageContent = (page: Page, index: number) => {
    // Even though this renders as a single page, the authored JSON still has pages
    const totalPreviousQuestions = numQuestionsOnPreviousPages(page.position, activity);
    return (
      <React.Fragment key={index}>
        { page.sections.map((section, idx) => {
            const questionCount = numQuestionsOnPreviousSections(idx, page.sections) || 0;
            const embeddableQuestionNumberStart = questionCount + totalPreviousQuestions;
            return (
              <Section
                key={idx}
                section={section}
                questionNumberStart={embeddableQuestionNumberStart}
                pluginsLoaded={false}
              />
            );
          })
        }
      </React.Fragment>
    );
  };

  return (
    <div className="single-page-content" data-cy="single-page-content">
      {activity.pages.filter((page) => !page.is_hidden).map((page, index: number) => (
        renderPageContent(page, index)
      ))}
      { activity.related && <RelatedContent relatedContentText={activity.related} /> }
      { activity.show_submit_button && <SubmitButton/> }
    </div>
  );
};
