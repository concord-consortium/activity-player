import React from "react";
import { Embeddable } from "./embeddable";
import { BottomButtons } from "./bottom-buttons";
import { PageLayouts, EmbeddableSections, isQuestion, getPageSectionQuestionCount,
         VisibleEmbeddables, getVisibleEmbeddablesOnPage } from "../../utilities/activity-utils";
import { SidebarWrapper } from "../page-sidebar/sidebar-wrapper";
import { renderHTML } from "../../utilities/render-html";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";

import "./activity-page-content.scss";
import { Page, EmbeddableWrapper } from "../../types";

const kPinMargin = 20;

interface IProps {
  enableReportButton: boolean;
  isFirstActivityPage: boolean;
  isLastActivityPage: boolean;
  onPageChange: (page: number) => void;
  page: Page;
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
    const { enableReportButton, isFirstActivityPage, isLastActivityPage, page, pageNumber, totalPreviousQuestions } = this.props;
    const { scrollOffset } = this.state;
    const primaryFirst = page.layout === PageLayouts.FullWidth || page.layout === PageLayouts.FortySixty;
    const pageSectionQuestionCount = getPageSectionQuestionCount(page);
    const visibleEmbeddables: VisibleEmbeddables = getVisibleEmbeddablesOnPage(page);

    const questionsBeforePrimary = totalPreviousQuestions + pageSectionQuestionCount.Header
                                   + (primaryFirst ? 0 : pageSectionQuestionCount.InfoAssessment);
    const primaryIsOnLeft = page.layout === PageLayouts.FortySixty;
    const pinOffSet = page.layout !== PageLayouts.FullWidth && visibleEmbeddables.infoAssessment.length ? scrollOffset : 0;
    const renderPrimary = this.renderPrimaryEmbeddables(visibleEmbeddables.interactiveBox, questionsBeforePrimary, page.layout, primaryIsOnLeft, pinOffSet);

    const questionsBeforeSecondary = totalPreviousQuestions + pageSectionQuestionCount.Header
                                     + (primaryFirst ? pageSectionQuestionCount.InteractiveBlock : 0);
    const secondaryIsOnLeft = page.layout === PageLayouts.Responsive || page.layout === PageLayouts.SixtyForty;
    const collapsible = page.toggle_info_assessment && page.layout !== PageLayouts.FullWidth;
    const renderSecondary = this.renderSecondaryEmbeddables(visibleEmbeddables.infoAssessment, questionsBeforeSecondary, page.layout, secondaryIsOnLeft, collapsible);
    const pageTitle = page.name || "";

    const [first, second] = primaryFirst
                            ? [renderPrimary, renderSecondary]
                            : [renderSecondary, renderPrimary];

    return (
      <div className={`page-content ${page.layout === PageLayouts.Responsive ? "full" : ""}`} data-cy="page-content">
        <div className="name">{`Page ` + pageNumber + `: ` + pageTitle}</div>
        <div className="introduction">
          { page.text && renderHTML(page.text) }
          { visibleEmbeddables.headerBlock.length > 0 && this.renderIntroEmbeddables(visibleEmbeddables.headerBlock, totalPreviousQuestions) }
        </div>
        <div className={`embeddables ${page.layout === PageLayouts.FullWidth ? "vertical" : ""}`}>
          { first }
          { second }
        </div>
        <BottomButtons
          onBack={!isFirstActivityPage ? this.handleBack : undefined}
          onNext={!isLastActivityPage ? this.handleNext : undefined}
          onGenerateReport={enableReportButton ? this.handleReport : undefined}
        />
        {page.show_sidebar &&
          <SidebarWrapper sidebars={[{ content: page.sidebar, title: page.sidebar_title }]} />
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
      const el = document.querySelector("#app");
      if (el) {
        el.scrollTo(0, 0);
      }
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
  private handleReport = () => {
    // TODO: create report when pressed
  }

  private renderEmbeddables = (embeddables: EmbeddableWrapper[], section: EmbeddableSections, totalPreviousQuestions: number) => {
    let questionNumber = totalPreviousQuestions;
    return (
      <React.Fragment>
        { embeddables.map((embeddableWrapper, i: number) => {
            if (isQuestion(embeddableWrapper)) {
              questionNumber++;
            }
            return (
              <Embeddable
                key={`embeddable ${i}`}
                embeddableWrapper={embeddableWrapper}
                isPageIntroduction={i === 0 && section === EmbeddableSections.Introduction}
                pageLayout={this.props.page.layout}
                questionNumber={isQuestion(embeddableWrapper) ? questionNumber : undefined}
              />
            );
          })
        }
      </React.Fragment>
    );
  }

  private renderIntroEmbeddables = (embeddables: EmbeddableWrapper[], totalPreviousQuestions: number) => {
    return (
      <div className="embeddables">
        <div className="group responsive">
          {this.renderEmbeddables(embeddables, EmbeddableSections.Introduction, totalPreviousQuestions)}
        </div>
      </div>
    );
  }

  private renderPrimaryEmbeddables = (embeddables: EmbeddableWrapper[], totalPreviousQuestions: number, layout: string, isLeft: boolean, pinOffset: number) => {
    const position = { top: pinOffset };
    const isFullWidth = layout === PageLayouts.FullWidth;
    const containerClass = `group fill-remaining ${isFullWidth ? "responsive top" : ""} ${isLeft ? "left" : ""}`;
    return (
      <div className={containerClass} style={position} ref={elt => this.primaryDivRef = elt}>
        {this.renderEmbeddables(embeddables, EmbeddableSections.Interactive, totalPreviousQuestions)}
      </div>
    );
  }

  private renderSecondaryEmbeddables = (embeddables: EmbeddableWrapper[], totalPreviousQuestions: number, layout: string, isLeft: boolean, collapsible: boolean) => {
    const { isSecondaryCollapsed } = this.state;
    const isFullWidth = layout === PageLayouts.FullWidth;
    const staticWidth = layout === PageLayouts.FortySixty || layout === PageLayouts.SixtyForty || layout === PageLayouts.Responsive;
    const containerClass = `group ${isFullWidth ? "responsive" : ""} ${isLeft ? "left" : ""} ${staticWidth ? "static-width" : ""} ${isSecondaryCollapsed ? "collapsed" : ""}`;
    return (
      <div className={containerClass} ref={elt => this.secondaryDivRef = elt}>
        {collapsible && this.renderCollapsibleHeader()}
        {!isSecondaryCollapsed && this.renderEmbeddables(embeddables, EmbeddableSections.InfoAssessment, totalPreviousQuestions)}
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
        {isSecondaryCollapsed
          ? <React.Fragment>
            {this.renderCollapseArrow(rightOrientation)}
            <div>Show</div>
          </React.Fragment>
          : <React.Fragment>
            {rightOrientation && <div>Hide</div>}
            {this.renderCollapseArrow(!rightOrientation)}
            {!rightOrientation && <div>Hide</div>}
          </React.Fragment>
        }
      </div>
    );
  }

  private renderCollapseArrow = (leftArrow: boolean) => {
    return (
      <React.Fragment>
        {leftArrow
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
