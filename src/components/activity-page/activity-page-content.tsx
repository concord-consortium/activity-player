import React from "react";
import { Embeddable } from "./embeddable";
import { BottomButtons } from "./bottom-buttons";
import { PageLayouts, EmbeddableSections, isQuestion, getPageSectionQuestionCount } from "../../utilities/activity-utils";
import { SidebarWrapper } from "../page-sidebar/sidebar-wrapper";
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

    const introEmbeddables = page.embeddables.filter((e: any) => e.section === EmbeddableSections.Introduction);
    const primaryEmbeddables = page.embeddables.filter((e: any) => e.section === EmbeddableSections.Interactive);
    const secondaryEmbeddables = page.embeddables.filter((e: any) => (e.section !== EmbeddableSections.Interactive && e.section !== EmbeddableSections.Introduction));

    const pinOffSet = page.layout !== PageLayouts.FullWidth && secondaryEmbeddables.length ? scrollOffset : 0;
    const pageSectionQuestionCount = getPageSectionQuestionCount(page);
    const questionsBeforePrimary = totalPreviousQuestions + pageSectionQuestionCount.Header
                                   + (primaryFirst ? 0 : pageSectionQuestionCount.InfoAssessment);
    const renderPrimary = this.renderPrimaryEmbeddables(primaryEmbeddables, questionsBeforePrimary, vertical, primaryFirst && !vertical, pinOffSet);

    const collapsible = page.toggle_info_assessment && page.layout !== PageLayouts.FullWidth;
    const questionsBeforeSecondary = totalPreviousQuestions + pageSectionQuestionCount.Header
                                     + (primaryFirst ? pageSectionQuestionCount.InteractiveBlock : 0);
    const renderSecondary = this.renderSecondaryEmbeddables(secondaryEmbeddables, questionsBeforeSecondary, !primaryFirst && !vertical, collapsible);

    const [first, second] = primaryFirst
                            ? [renderPrimary, renderSecondary]
                            : [renderSecondary, renderPrimary];

    return (
      <div className={`page-content ${useFullPageWidth ? "full" : ""}`} data-cy="page-content">
        <div className="name">{page.name}</div>
        <div className="introduction">
          { page.text && renderHTML(page.text) }
          { introEmbeddables && this.renderEmbeddables(introEmbeddables, EmbeddableSections.Introduction, totalPreviousQuestions) }
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
          <SidebarWrapper sidebars={[{content: page.sidebar, title: page.sidebar_title }]}/>
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

  private renderEmbeddables = (embeddables: any[], section: EmbeddableSections, totalPreviousQuestions: number) => {
    let questionNumber = totalPreviousQuestions;
    return (
      <React.Fragment>
        { embeddables.map((embeddable: any, i: number) => {
            if (isQuestion(embeddable)) {
              questionNumber++;
            }
            return (
              <Embeddable
                key={`embeddable ${i}`}
                embeddable={embeddable}
                isPageIntroduction={i === 0 && section === EmbeddableSections.Introduction}
                pageLayout={this.props.page.layout}
                questionNumber={isQuestion(embeddable) ? questionNumber : undefined}
              />
            );
          })
        }
      </React.Fragment>
    );
  }

  private renderPrimaryEmbeddables = (primaryEmbeddables: any[], totalPreviousQuestions: number, vertical: boolean, leftContent: boolean, pinOffset: number) => {
    const position = { top: pinOffset };
    const containerClass = `group fill-remaining ${vertical ? "top" : ""} ${leftContent ? "left" : ""}`;
    return (
      <div className={containerClass} style={position} ref={elt => this.primaryDivRef = elt}>
        { this.renderEmbeddables(primaryEmbeddables, EmbeddableSections.Interactive, totalPreviousQuestions) }
      </div>
    );
  }

  private renderSecondaryEmbeddables = (secondaryEmbeddables: any[], totalPreviousQuestions: number, leftContent: boolean, collapsible: boolean) => {
    const { isSecondaryCollapsed } = this.state;
    const pageLayout = this.props.page.layout;
    const staticWidth = pageLayout === PageLayouts.FortySixty || pageLayout === PageLayouts.SixtyForty || pageLayout === PageLayouts.Responsive;
    const containerClass = `group ${leftContent ? "left" : ""} ${staticWidth ? "static-width" : ""} ${isSecondaryCollapsed ? "collapsed" : ""}`;
    return (
      <div className={containerClass} ref={elt => this.secondaryDivRef = elt}>
        { collapsible && this.renderCollapsibleHeader() }
        { !isSecondaryCollapsed && this.renderEmbeddables(secondaryEmbeddables, EmbeddableSections.InfoAssessment, totalPreviousQuestions)}
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
