import React from "react";
// import { ActivityLayouts, PageLayouts, isQuestion, VisibleEmbeddables, getVisibleEmbeddablesOnPage,
//          EmbeddableSections, getLinkedPluginEmbeddable } from "../../utilities/activity-utils";
import { ActivityLayouts, isQuestion, getLinkedPluginEmbeddable } from "../../utilities/activity-utils";
import { Embeddable } from "../activity-page/embeddable";
import { RelatedContent } from "./related-content";
import { SubmitButton } from "./submit-button";

import "./single-page-content.scss";
import { Activity, Page } from "../../types";

interface IProps {
  activity: Activity;
  teacherEditionMode?: boolean;
  pluginsLoaded: boolean;
}

export const SinglePageContent: React.FC<IProps> = (props) => {
  const { activity, teacherEditionMode, pluginsLoaded } = props;
  let questionNumber = 0;
  let embeddableNumber = 0;

  const renderPageContent = (page: Page, index: number) => {
    // const visibleEmbeddables: VisibleEmbeddables = getVisibleEmbeddablesOnPage(page);
    // const embeddables = [...visibleEmbeddables.headerBlock, ...visibleEmbeddables.interactiveBox, ...visibleEmbeddables.infoAssessment];
    const onSizeChange = () => {
      // setResizeCounter(counter++);
      console.log("in single-page-content:");
    };
    return (
      <React.Fragment key={index}>
        { page.sections.map((section) => {
            section.embeddables.map((embeddable, i: number) => {
              if (isQuestion(embeddable)) {
                questionNumber++;
              }
              embeddableNumber++;
              const linkedPluginEmbeddable = getLinkedPluginEmbeddable(section, embeddable.ref_id);
              return (
                <Embeddable
                  activityLayout={ActivityLayouts.SinglePage}
                  key={`embeddable ${embeddableNumber}`}
                  embeddable={embeddable}
                  sectionLayout={section.layout}
                  questionNumber={isQuestion(embeddable) ? questionNumber : undefined}
                  linkedPluginEmbeddable={linkedPluginEmbeddable}
                  teacherEditionMode={teacherEditionMode}
                  pluginsLoaded={pluginsLoaded}
                  onSizeChange={onSizeChange}
                />
              );
            });
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
