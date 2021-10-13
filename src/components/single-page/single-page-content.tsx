import React from "react";
import { ActivityLayouts, isQuestion, getLinkedPluginEmbeddable, numQuestionsOnPreviousSections } from "../../utilities/activity-utils";
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
  const { activity, teacherEditionMode, pluginsLoaded } = props;
  const questionNumber = 0;
  const renderPageContent = (page: Page, index: number) => {

    return (
      <React.Fragment key={index}>
        { page.sections.map((section, idx) => {
            const questionCount = numQuestionsOnPreviousSections(idx, page.sections) || 0;
            const embeddableQuestionNumberStart = questionCount + questionNumber;
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
