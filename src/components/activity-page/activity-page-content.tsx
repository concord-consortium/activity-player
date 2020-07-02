import React from "react";
import { PrimaryEmbeddable } from "./primary-embeddable";
import { SecondaryEmbeddable } from "./secondary-embeddable";
import { BottomButtons } from "./bottom-buttons";
import { PageLayouts, EmbeddableSections } from "../../utilities/activity-utils";
import { renderHTML } from "../../utilities/render-html";

import "./activity-page-content.scss";

const kPinMargin = 20;

interface IProps {
  isFirstActivityPage: boolean;
  isLastActivityPage: boolean;
  onPageChange: (page: number) => void;
  page: any;
  pageNumber: number;
  totalPreviousQuestions: number;
}

interface IState {
  scrollOffset: number;
}

export class ActivityPageContent extends React.PureComponent <IProps, IState> {
  private divRef: HTMLDivElement | null;
  public constructor(props: IProps) {
    super(props);
    this.state = {
      scrollOffset: 0
    };
  }

  render() {
    const { isFirstActivityPage, isLastActivityPage, page, totalPreviousQuestions } = this.props;
    const { scrollOffset } = this.state;
    // Layout types are named in a somewhat confusing manner - particularly in relation to container widths.
    // Responsive layout actually uses the entire page width, whereas the other layouts use only 960 horizontal pixels.
    // FullWidth layout, despite its name, does not use the full screen width (it would be better named "stacked").
    // However, in an effort to sync names with the authoring and activity JSON we will continue to use the previously defined naming conventions.
    const useFullPageWidth = page.layout === PageLayouts.Responsive;
    const vertical = page.layout === PageLayouts.FullWidth;
    const primaryFirst = page.layout === PageLayouts.FullWidth || page.layout === PageLayouts.FortySixty;

    const primaryEmbeddables = page.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive);
    const secondaryEmbeddables = page.embeddables.filter((e: any) => !e.section);

    const pinOffSet = page.layout !== PageLayouts.FullWidth && secondaryEmbeddables.length ? scrollOffset : 0;

    const renderPrimary = this.renderPrimaryEmbeddables(primaryEmbeddables, vertical, primaryFirst && !vertical, pinOffSet);
    const renderSecondary = this.renderSecondaryEmbeddables(secondaryEmbeddables, totalPreviousQuestions, !primaryFirst && !vertical);
    const [first, second] = primaryFirst
                            ? [renderPrimary, renderSecondary]
                            : [renderSecondary, renderPrimary];

    return (
      <div className={`page-content ${useFullPageWidth ? "full" : ""}`} data-cy="page-content">
        <div className="name">{page.name}</div>
        <div className="introduction">
          { renderHTML(page.text) }
        </div>
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

  public componentDidMount() {
    const el = document.querySelector("#app");
    if (el) {
      el.addEventListener("scroll", this.handleScroll, false);
    }
  }

  public componentWillUnmount() {
    const el = document.querySelector("#app");
    if (el) {
      el.removeEventListener("scroll", this.handleScroll, false);
    }
  }

  private handleScroll = (e: MouseEvent) => {
    if (this.divRef) {
      const scrollOffset = this.divRef.getBoundingClientRect().top < kPinMargin
        ? kPinMargin - this.divRef.getBoundingClientRect().top
        : 0;
      this.setState({ scrollOffset });
    }
  }

  private handleBack = () => {
    this.props.onPageChange(this.props.pageNumber - 1);
  }
  private handleNext = () => {
    this.props.onPageChange(this.props.pageNumber + 1);
  }

  private renderPrimaryEmbeddables = (primaryEmbeddables: any[], vertical: boolean, leftContent: boolean, pinOffset: number) => {
    const position = { top: pinOffset };
    return (
      <div className={`group fill-remaining ${vertical ? "top" : ""} ${leftContent ? "left" : ""}`} style={position}>
        {primaryEmbeddables.map((embeddable: any, i: number) => (
          <PrimaryEmbeddable key={`embeddable ${i}`} embeddable={embeddable} />
        ))}
      </div>
    );
  }

  private renderSecondaryEmbeddables = (secondaryEmbeddables: any[], totalPreviousQuestions: number, leftContent: boolean) => {
    return (
      <div className={`group ${leftContent ? "left" : ""}`} ref={elt => this.divRef = elt}>
        {secondaryEmbeddables.map((embeddable: any, i: number) => (
          <SecondaryEmbeddable key={`embeddable ${i}`} embeddable={embeddable} questionNumber={totalPreviousQuestions + i + 1} />
        ))}
      </div>
    );
  }

}
