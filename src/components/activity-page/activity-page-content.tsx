import React from "react";
import { Embeddable } from "./embeddable";
import { BottomButtons } from "./bottom-buttons";
import { PageLayouts, EmbeddableSections, isQuestion, getPageSectionQuestionCount,
         VisibleEmbeddables, getVisibleEmbeddablesOnPage, getLinkedPluginEmbeddable } from "../../utilities/activity-utils";
import { renderHTML } from "../../utilities/render-html";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import { Page, EmbeddableWrapper } from "../../types";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../../lib/logger";
import { queryValue } from "../../utilities/url-query";
import { fetchPortalData } from "../../portal-api";
// import { DEFAULT_PORTAL_REPORT_URL } from "../app";

import "./activity-page-content.scss";

const kPinMargin = 20;

interface IProps {
  enableReportButton: boolean;
  isFirstActivityPage: boolean;
  isLastActivityPage: boolean;
  onPageChange: (page: number) => void;
  page: Page;
  pageNumber: number;
  teacherEditionMode?: boolean;
  totalPreviousQuestions: number;
  setNavigation: (refId: string, options: INavigationOptions) => void;
  lockForwardNav?: boolean;
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
    const { enableReportButton, isFirstActivityPage, isLastActivityPage, page, pageNumber, totalPreviousQuestions, lockForwardNav } = this.props;
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
          lockForwardNav={lockForwardNav}
          onGenerateReport={enableReportButton ? this.handleReport : undefined}
        />
      </div>
    );
  }

  public componentDidMount() {
    const el = document.querySelector("#app");
    if (el) {
      el.addEventListener("scroll", this.handleScroll, false);
      el.scrollTo(0, 0);
    }
  }

  public componentWillUnmount() {
    const el = document.querySelector("#app");
    if (el) {
      el.removeEventListener("scroll", this.handleScroll, false);
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

  private handleReport = async () => {
    const reportLink = "https://localhost:8081";
    // const reportLink = (queryValue("portal-report") as string) || DEFAULT_PORTAL_REPORT_URL;
    const activity = queryValue("activity");
    const activityUrl = activity? ((activity.split(".json"))[0]).replace("api/v1/","") : "";

    const runKey= queryValue("runKey");
    if (runKey) {
      const answerSource = window.location.hostname;
      window.open(reportLink + "?runKey=" + runKey + "&activity=" + activityUrl + "&answerSource="+answerSource);
    }
    else {
      const portalData = await fetchPortalData();
      const classInfoUrl = portalData?.portalJWT?.class_info_url;
      const classId = classInfoUrl?.split("classes/")[1];
      const classOfferings = encodeURIComponent("https://learn.staging.concord.org/api/v1/offerings?class_id=" + classId);
      const offeringId = portalData?.offering.id;
      const offeringUrl = encodeURIComponent("https://learn.staging.concord.org/api/v1/offerings/" + offeringId);
      const studentId = portalData?.platformUserId;
      const reportURL = reportLink
                        + "?"
                        + "class=" + encodeURIComponent(classInfoUrl || "")
                        + "&classOfferings=" + classOfferings
                        + "&firebase-app=report-service-dev"
                        + "&offering=" + offeringUrl
                        + "&activityUrl=" + activityUrl
                        + "&reportType=offering&studentId="+studentId
                        + "&tool-id=https://authoring.staging.concord.org"
                        + "&auth-domain=https://learn.staging.concord.org";
      window.open(reportURL);
    }

    Logger.log({
      event: LogEventName.create_report
    });
  }

  private renderEmbeddables = (embeddables: EmbeddableWrapper[], section: EmbeddableSections, totalPreviousQuestions: number) => {
    let questionNumber = totalPreviousQuestions;
    return (
      <React.Fragment>
        { embeddables.map((embeddableWrapper) => {
            if (isQuestion(embeddableWrapper)) {
              questionNumber++;
            }
            const linkedPluginEmbeddable = getLinkedPluginEmbeddable(this.props.page, embeddableWrapper.embeddable.ref_id);
            return (
              <Embeddable
                key={`embeddable-${embeddableWrapper.embeddable.ref_id}`}
                embeddableWrapper={embeddableWrapper}
                pageLayout={this.props.page.layout}
                pageSection={section}
                questionNumber={isQuestion(embeddableWrapper) ? questionNumber : undefined}
                linkedPluginEmbeddable={linkedPluginEmbeddable}
                teacherEditionMode={this.props.teacherEditionMode}
                setNavigation={this.props.setNavigation}
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
        <div className="group fill-remaining responsive">
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
      <div className={headerClass} data-cy="collapsible-header" tabIndex={0}
            onClick={this.handleCollapseHeader} onKeyDown={this.handleCollapseHeader} >
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
      leftArrow
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
    );
  }

  private handleCollapseHeader = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
    if (accessibilityClick(e))  {
      Logger.log({
        event: LogEventName.toggle_collapsible_column,
        parameters:{ hide_column: !this.state.isSecondaryCollapsed }
      });
      this.setState(state => ({ isSecondaryCollapsed: !state.isSecondaryCollapsed }));
    }
  }

}
