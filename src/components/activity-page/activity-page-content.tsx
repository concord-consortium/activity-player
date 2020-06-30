import React from "react";
import { PrimaryEmbeddable } from "./primary-embeddable";
import { SecondaryEmbeddable } from "./secondary-embeddable";
import { BottomButtons } from "./bottom-buttons";
import { PageLayouts, EmbeddableSections } from "../../utilities/activity-utils";

import './activity-page-content.scss';

interface IProps {
  isFirstActivityPage: boolean;
  isLastActivityPage: boolean;
  onPageChange: (page: number) => void;
  page: any;
  pageNumber: number;
  totalPreviousQuestions: number;
}

export class ActivityPageContent extends React.PureComponent <IProps> {

  render() {
    const { isFirstActivityPage, isLastActivityPage, page, totalPreviousQuestions } = this.props;

    const fullWidth = page.layout === PageLayouts.Responsive;
    const vertical = page.layout === PageLayouts.FullWidth;
    const primaryFirst = page.layout === PageLayouts.FullWidth || page.layout === PageLayouts.FortySixty;

    const primaryEmbeddables = page.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive);
    const secondaryEmbeddables = page.embeddables.filter((e: any) => !e.section);

    const renderPrimary = this.renderPrimaryEmbeddables(primaryEmbeddables, vertical, primaryFirst && !vertical);
    const renderSecondary = this.renderSecondaryEmbeddables(secondaryEmbeddables, totalPreviousQuestions, !primaryFirst && !vertical);
    const [first, second] = primaryFirst
                            ? [renderPrimary, renderSecondary]
                            : [renderSecondary, renderPrimary];

    return (
      <div className={`page-content ${fullWidth ? "full" : ""}`} data-cy="page-content">
        <div className="name">{page.name}</div>
        <div className="introduction" dangerouslySetInnerHTML={{ __html: page.text}}></div>
        <div className={`embeddables ${vertical ? "vertical" : ""}`}>
          { first }
          { second }
        </div>
        <BottomButtons
          onBack={!isFirstActivityPage ? this.handleBack : undefined}
          onNext={!isLastActivityPage ? this.handleNext : undefined}
        />
      </div>
    );
  }

  private handleBack = () => {
    this.props.onPageChange(this.props.pageNumber - 1);
  }
  private handleNext = () => {
    this.props.onPageChange(this.props.pageNumber + 1);
  }

  private renderPrimaryEmbeddables = (primaryEmbeddables: any[], vertical: boolean, leftContent: boolean) => {
    return (
      <div className={`group fill-remaining ${vertical ? "top" : ""} ${leftContent ? "left" : ""}`}>
        {primaryEmbeddables.map((embeddable: any, i: number) => (
          <PrimaryEmbeddable key={`embeddable ${i}`} embeddable={embeddable} />
        ))}
      </div>
    );
  }

  private renderSecondaryEmbeddables = (secondaryEmbeddables: any[], totalPreviousQuestions: number, leftContent: boolean) => {
    return (
      <div className={`group ${leftContent ? "left" : ""}`}>
        {secondaryEmbeddables.map((embeddable: any, i: number) => (
          <SecondaryEmbeddable key={`embeddable ${i}`} embeddable={embeddable} questionNumber={totalPreviousQuestions + i + 1} />
        ))}
      </div>
    );
  }

}
