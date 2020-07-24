import React from "react";
import { ActivityLayouts, PageLayouts, isQuestion, VisibleEmbeddables, getVisibleEmbeddablesOnPage } from "../../utilities/activity-utils";
import { Embeddable } from "../activity-page/embeddable";
import { SidebarWrapper, SidebarConfiguration } from "../page-sidebar/sidebar-wrapper";
import { RelatedContent } from "./related-content";
import { SubmitButton } from "./submit-button";

import "./single-page-content.scss";

interface IProps {
  activity: any;
}

export const SinglePageContent: React.FC<IProps> = (props) => {
  const { activity } = props;
  let questionNumber = 0;
  let embeddableNumber = 0;

  const renderPageContent = (page: any, index: number) => {
    const visibleEmbeddables: VisibleEmbeddables = getVisibleEmbeddablesOnPage(page);
    const embeddables = [...visibleEmbeddables.headerBlock, ...visibleEmbeddables.interactiveBox, ...visibleEmbeddables.infoAssessment];
    return (
      <React.Fragment key={index}>
        { embeddables.map((embeddable: any, i: number) => {
            if (isQuestion(embeddable)) {
              questionNumber++;
            }
            embeddableNumber++;
            return (
              <Embeddable
                activityLayout={ActivityLayouts.SinglePage}
                key={`embeddable ${embeddableNumber}`}
                embeddable={embeddable}
                isPageIntroduction={questionNumber === 0}
                pageLayout={PageLayouts.FullWidth}
                questionNumber={isQuestion(embeddable) ? questionNumber : undefined}
              />
            );
          })
        }
      </React.Fragment>
    );
  };

  const renderSidebars = () => {
    const sidebars: SidebarConfiguration[] = activity.pages.filter((page: any) => page.show_sidebar).map((page: any) => (
      {content: page.sidebar, title: page.sidebar_title }
    ));
    return (
      <React.Fragment>
        <SidebarWrapper sidebars={sidebars}/>
      </React.Fragment>
    );
  };

  return (
    <div className="single-page-content" data-cy="single-page-content">
      {activity.pages.filter((page: any) => !page.is_hidden).map((page: any, index: number) => (
        renderPageContent(page, index)
      ))}
      { activity.related && <RelatedContent relatedContentText={activity.related} /> }
      { activity.show_submit_button && <SubmitButton/> }
      { renderSidebars() }
    </div>
  );
};

