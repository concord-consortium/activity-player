import React from "react";
import { PrimaryEmbeddable } from "./primary-embeddable";
import { SecondaryEmbeddable } from "./secondary-embeddable";
import { BottomButtons } from "./bottom-buttons";
import { PageLayouts, EmbeddableSections, isQuestion } from "../../utilities/activity-utils";
import { Sidebar } from "../page-sidebar/sidebar";
import { renderHTML } from "../../utilities/render-html";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";

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
  isSecondaryCollapsed: boolean;
}

export class ActivityPageContent extends React.PureComponent <IProps, IState> {
  private primaryDivRef: HTMLDivElement | null;
  private secondaryDivRef: HTMLDivElement | null;
  public constructor(props: IProps) {
    super(props);
    this.state = {
      scrollOffset: 0,
      isSecondaryCollapsed: false,
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
    const collapsible = page.toggle_info_assessment && page.layout !== PageLayouts.FullWidth;
    const renderSecondary = this.renderSecondaryEmbeddables(secondaryEmbeddables, totalPreviousQuestions, !primaryFirst && !vertical, collapsible);
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
        {page.show_sidebar &&
          <Sidebar content={page.sidebar} title={page.sidebar_title} />
        }
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

  public componentDidUpdate(prevProps: any) {
    if (prevProps.pageNumber !== this.props.pageNumber) {
      this.setState({ isSecondaryCollapsed: false, scrollOffset: 0 });
    }
  }

  private handleScroll = (e: MouseEvent) => {
    if (this.secondaryDivRef) {
      const secondaryHeight = this.secondaryDivRef.getBoundingClientRect().height;
      const primaryHeight = this.primaryDivRef?.getBoundingClientRect().height;
      const potentialScrollOffset = this.secondaryDivRef.getBoundingClientRect().top < kPinMargin
        ? kPinMargin - this.secondaryDivRef.getBoundingClientRect().top
        : 0;
      const scrollOffset = primaryHeight && (potentialScrollOffset + primaryHeight) > secondaryHeight
        ? secondaryHeight - primaryHeight
        : potentialScrollOffset;
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
      <div className={`group fill-remaining ${vertical ? "top" : ""} ${leftContent ? "left" : ""}`} style={position} ref={elt => this.primaryDivRef = elt}>
        {primaryEmbeddables.map((embeddable: any, i: number) => (
          <PrimaryEmbeddable key={`embeddable ${i}`} embeddable={embeddable} />
        ))}
      </div>
    );
  }

  private renderSecondaryEmbeddables = (secondaryEmbeddables: any[], totalPreviousQuestions: number, leftContent: boolean, collapsible: boolean) => {
    const { isSecondaryCollapsed } = this.state;
    let questionNumber = totalPreviousQuestions;
    return (
      <div className={`group ${leftContent ? "left" : ""} ${isSecondaryCollapsed ? "collapsed" : ""}`} ref={elt => this.secondaryDivRef = elt}>
        { collapsible && this.renderCollapsibleHeader() }
        { !isSecondaryCollapsed && secondaryEmbeddables.map((embeddable: any, i: number) => {
            if (isQuestion(embeddable)) {
              questionNumber++;
            }
            return (
              <SecondaryEmbeddable
                key={`embeddable ${i}`}
                embeddable={embeddable}
                questionNumber={questionNumber}
                isFullWidth={embeddable.embeddable.is_full_width}
              />
            );
          })
        }
      </div>
    );
  }

  private renderCollapsibleHeader = () => {
    const { isSecondaryCollapsed } = this.state;
    const { page } = this.props;
    const rightOrientation = page.layout === PageLayouts.FortySixty;
    const headerClass = `collapsible-header ${isSecondaryCollapsed ? "collapsed" : ""} ${rightOrientation ? "right" : ""}`;
    return (
      <div onClick={this.handleCollapseClick} className={headerClass}>
        { isSecondaryCollapsed
          ? <React.Fragment>
              {this.renderCollapseArrow(rightOrientation)}
              <div>Show</div>
            </React.Fragment>
          : <React.Fragment>
              { rightOrientation && <div>Hide</div> }
              {this.renderCollapseArrow(!rightOrientation)}
              { !rightOrientation && <div>Hide</div> }
            </React.Fragment>
        }
      </div>
    );
  }

  private renderCollapseArrow = (leftArrow: boolean) => {
    return (
      <React.Fragment>
        { leftArrow
          ? <IconChevronLeft
              width={32}
              height={32}
              fill={"white"}
            />
          : <IconChevronRight
              width={32}
              height={32}
              fill={"white"}
            />
        }
      </React.Fragment>
    );
  }

  private handleCollapseClick = () => {
    this.setState({ isSecondaryCollapsed: !this.state.isSecondaryCollapsed });
  }
}
