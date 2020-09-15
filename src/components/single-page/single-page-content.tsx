import React from "react";
import { ActivityLayouts, PageLayouts, isQuestion, VisibleEmbeddables, getVisibleEmbeddablesOnPage } from "../../utilities/activity-utils";
import { Embeddable } from "../activity-page/embeddable";
import { SidebarWrapper, SidebarConfiguration } from "../page-sidebar/sidebar-wrapper";
import { RelatedContent } from "./related-content";
import { SubmitButton } from "./submit-button";

import "./single-page-content.scss";
import { Activity, Page } from "../../types";

interface IProps {
  activity: Activity;
  teacherEditionMode?: boolean;
}

export const SinglePageContent: React.FC<IProps> = (props) => {
  const { activity, teacherEditionMode } = props;
  let questionNumber = 0;
  let embeddableNumber = 0;

  const renderPageContent = (page: Page, index: number) => {
    const visibleEmbeddables: VisibleEmbeddables = getVisibleEmbeddablesOnPage(page);
    const embeddables = [...visibleEmbeddables.headerBlock, ...visibleEmbeddables.interactiveBox, ...visibleEmbeddables.infoAssessment];
    return (
      <React.Fragment key={index}>
        { embeddables.map((embeddableWrapper, i: number) => {
            if (isQuestion(embeddableWrapper)) {
              questionNumber++;
            }
            embeddableNumber++;
            return (
              <Embeddable
                activityLayout={ActivityLayouts.SinglePage}
                key={`embeddable ${embeddableNumber}`}
                embeddableWrapper={embeddableWrapper}
                isPageIntroduction={questionNumber === 0}
                pageLayout={PageLayouts.FullWidth}
                questionNumber={isQuestion(embeddableWrapper) ? questionNumber : undefined}
                teacherEditionMode={teacherEditionMode}
              />
            );
          })
        }
      </React.Fragment>
    );
  };

  const renderSidebars = () => {
    const sidebars: SidebarConfiguration[] = activity.pages.filter((page) => page.show_sidebar).map((page) => (
      {content: page.sidebar, title: page.sidebar_title }
    ));
    return (
      <SidebarWrapper sidebars={sidebars}/>
    );
  };

  return (
    <div className="single-page-content" data-cy="single-page-content">
      {activity.pages.filter((page) => !page.is_hidden).map((page, index: number) => (
        renderPageContent(page, index)
      ))}
      { activity.related && <RelatedContent relatedContentText={activity.related} /> }
      { activity.show_submit_button && <SubmitButton/> }
      { renderSidebars() }
    </div>
  );
};

