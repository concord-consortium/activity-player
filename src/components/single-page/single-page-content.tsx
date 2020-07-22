import React from "react";
import { ActivityLayouts, EmbeddableSections, PageLayouts, isQuestion } from "../../utilities/activity-utils";
import { Embeddable } from "../activity-page/embeddable";
import { Sidebar } from "../page-sidebar/sidebar";
import { RelatedContent } from "./related-content";
import { SubmitButton } from "./submit-button";

import "./single-page-content.scss";

const kSidebarTop = 200;
const kSidebarOffset = 100;

interface IProps {
  activity: any;
}

export const SinglePageContent: React.FC<IProps> = (props) => {
  const { activity } = props;
  let questionNumber = 0;
  let embeddableNumber = 0;
  let sidebarNumber = 0;

  const renderPageContent = (page: any, index: number) => {
    const introEmbeddables = page.embeddables.filter((e: any) => e.section === EmbeddableSections.Introduction);
    const primaryEmbeddables = page.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive);
    const secondaryEmbeddables = page.embeddables.filter((e: any) => (e.section !== EmbeddableSections.Interactive && e.section !== EmbeddableSections.Introduction));
    const embeddables = [...introEmbeddables, ...primaryEmbeddables, ...secondaryEmbeddables];
    const position = { top: kSidebarTop + kSidebarOffset * sidebarNumber};
    if (page.show_sidebar) {
      sidebarNumber++;
    }
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
        {page.show_sidebar &&
          <Sidebar content={page.sidebar} title={page.sidebar_title} style={position} />
        }
      </React.Fragment>
    );
  };


  return (
    <div className="single-page-content" data-cy="single-page-content">
      {activity.pages.map((page: any, index: number) => (
        renderPageContent(page, index)
      ))}
      { activity.related && <RelatedContent relatedContentText={activity.related} /> }
      { activity.show_submit_button && <SubmitButton/> }
    </div>
  );
};


