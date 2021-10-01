import React from "react";
import classNames from "classnames";
import { Embeddable, EmbeddableImperativeAPI } from "./embeddable";
import { BottomButtons } from "./bottom-buttons";
// import { PageLayouts, EmbeddableSections, isQuestion, getPageSectionQuestionCount,
//          VisibleEmbeddables, getVisibleEmbeddablesOnPage, getLinkedPluginEmbeddable } from "../../utilities/activity-utils";
import { isQuestion, getPageSectionQuestionCount, getLinkedPluginEmbeddable, numQuestionsOnPreviousSections } from "../../utilities/activity-utils";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import { Page, EmbeddableType, SectionType } from "../../types";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../../lib/logger";
import { showReport } from "../../utilities/report-utils";

import "./activity-page-content.scss";

const kPinMargin = 20;

interface IProps {
  enableReportButton: boolean;
  page: Page;
  pageNumber: number;
  teacherEditionMode?: boolean;
  totalPreviousQuestions: number;
  setNavigation: (refId: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
}

interface IState {
  scrollOffset: number;
  // isSecondaryCollapsed: boolean;
}

export class ActivityPageContent extends React.PureComponent <IProps, IState> {
  private primaryDivRef: HTMLDivElement | null;
  private secondaryDivRef: HTMLDivElement | null;
  private embeddableRefs: Record<string, React.RefObject<EmbeddableImperativeAPI>> = {};

  public constructor(props: IProps) {
    super(props);
    this.state = {
      scrollOffset: 0,
      // isSecondaryCollapsed: false,
    };
  }

  render() {
    const { enableReportButton, page, totalPreviousQuestions } = this.props;
    const { scrollOffset } = this.state;
    // const primaryFirst = page.layout === PageLayouts.FullWidth || page.layout === PageLayouts.FortySixty;
    const pageSectionQuestionCount = getPageSectionQuestionCount(page);
    // const visibleEmbeddables: VisibleEmbeddables = getVisibleEmbeddablesOnPage(page);

    // const questionsBeforePrimary = totalPreviousQuestions + pageSectionQuestionCount.Header
    //                                + (primaryFirst ? 0 : pageSectionQuestionCount.InfoAssessment);
    // const primaryIsOnLeft = page.layout === PageLayouts.FortySixty;
    // const pinOffSet = page.layout !== PageLayouts.FullWidth && visibleEmbeddables.infoAssessment.length ? scrollOffset : 0;
    // const renderPrimary = this.renderPrimaryEmbeddables(visibleEmbeddables.interactiveBox, questionsBeforePrimary, page.layout, primaryIsOnLeft, pinOffSet);
    // const questionsBeforeSecondary = totalPreviousQuestions + pageSectionQuestionCount.Header
    //                                  + (primaryFirst ? pageSectionQuestionCount.InteractiveBlock : 0);
    // const secondaryIsOnLeft = page.layout === PageLayouts.Responsive || page.layout === PageLayouts.SixtyForty;
    // const collapsible = page.toggle_info_assessment && page.layout !== PageLayouts.FullWidth;
    // const renderSecondary = this.renderSecondaryEmbeddables(visibleEmbeddables.infoAssessment, questionsBeforeSecondary, page.layout, secondaryIsOnLeft, collapsible);
    const pageTitle = page.name || "";
    const sections = page.sections;
    // const [first, second] = primaryFirst
    //                         ? [renderPrimary, renderSecondary]
    //                         : [renderSecondary, renderPrimary];

    return (
      <div className={"page-content full"} data-cy="page-content">
        <div className="name">{ pageTitle }</div>
        {this.renderSections(sections, totalPreviousQuestions)}
        { enableReportButton &&
          <BottomButtons
            onGenerateReport={this.handleReport}
          />
        }
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

  public requestInteractiveStates() {
    const promises = this.props.page.sections.forEach((section: SectionType) =>
        section.embeddables.map((embeddable: EmbeddableType) =>
          this.embeddableRefs[embeddable.ref_id]?.current?.requestInteractiveState() || Promise.resolve()
      )
    );
    return promises;
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

  private handleReport = () => {
    showReport();
    Logger.log({
      event: LogEventName.create_report
    });
  }

  private renderSections = (sections: SectionType[], totalPreviousQuestions: number) => {
    return (
      sections.map((section, idx) => {
        const questionCount = numQuestionsOnPreviousSections(idx, sections) || 0;
        const embeddableQuestionNumberStart = questionCount + totalPreviousQuestions;
        if (!section.is_hidden) {
          return this.renderSection(section, embeddableQuestionNumberStart, idx);
        }
      })
    );
  }

  private renderSection = (section: SectionType, questionNumberStart: number, idx: number) => {
    const layout = section.layout;
    const display_mode = section.secondary_column_display_mode;
    const splitLayout = layout === "l-6040" || layout === "r-6040" || layout === "l-7030" || layout === "r-3070";
    const sectionClass = classNames("section",
                                    {"full-width": layout === "full-width" || layout === "l-responsive"},
                                    {"l_6040": layout === "l-6040"},
                                    {"r_6040": layout === "r-6040"},
                                    {"l_7030": layout === "l-7030"},
                                    {"r_3070": layout === "r-3070"},
                                    {"stacked": display_mode === "stacked"},
                                    {"carousel": display_mode === "carousel"}
                                   );
    const embeddables = section.embeddables;

    if (!splitLayout) {
      return (
        <div key={`section_${idx}`} className = {sectionClass}>
          { this.renderEmbeddables(section, embeddables, questionNumberStart) }
        </div>
      );
    } else {
      const primaryEmbeddables = embeddables.filter(e => e.column === "primary");
      const secondaryEmbeddables = embeddables.filter(e => e.column === "secondary");
      const leftColumn = layout.includes("l") ? primaryEmbeddables : secondaryEmbeddables;
      const rightColumn = layout.includes("l") ? secondaryEmbeddables : primaryEmbeddables;
      const numQuestionsLeftColumn = layout.includes("l") ? primaryEmbeddables.length : secondaryEmbeddables.length;
      return (
        <div key={`section_${idx}`} className = {sectionClass}>
          <div className={`column ${layout} ${layout.includes("l") ? "primary" : "secondary"}`}>
            {this.renderEmbeddables(section, leftColumn, questionNumberStart)}
          </div>
          <div className={`column ${layout} ${layout.includes("l") ? "secondary" : "primary"}`}>
            {this.renderEmbeddables(section, rightColumn, questionNumberStart + numQuestionsLeftColumn)}
          </div>
        </div>
      );
    }
  }

  private renderEmbeddables = (section: SectionType, embeddables: EmbeddableType[], questionNumberStart: number) => {
    let questionNumber = questionNumberStart;
    return (
      <React.Fragment>
        { embeddables.map((embeddable, embeddableIndex) => {
            if (isQuestion(embeddable)) {
              questionNumber++;
            }
            const linkedPluginEmbeddable = getLinkedPluginEmbeddable(section, embeddable.ref_id);
            if (!this.embeddableRefs[embeddable.ref_id]) {
              this.embeddableRefs[embeddable.ref_id] = React.createRef<EmbeddableImperativeAPI>();
            }
            return (
              <Embeddable
                ref={this.embeddableRefs[embeddable.ref_id]}
                key={`embeddable-${embeddableIndex}-${embeddable.ref_id}`}
                embeddable={embeddable}
                sectionLayout={section.layout}
                displayMode={section.secondary_column_display_mode}
                questionNumber={isQuestion(embeddable) ? questionNumber : undefined}
                linkedPluginEmbeddable={linkedPluginEmbeddable}
                teacherEditionMode={this.props.teacherEditionMode}
                setNavigation={this.props.setNavigation}
                pluginsLoaded={this.props.pluginsLoaded}
              />
            );
          })
        }
      </React.Fragment>
    );
  }

}


  // private renderPrimaryEmbeddables = (embeddables: EmbeddableWrapper[], totalPreviousQuestions: number, layout: string, isLeft: boolean, pinOffset: number) => {
  //   const position = { top: pinOffset };
  //   const isFullWidth = layout === PageLayouts.FullWidth;
  //   const containerClass = `group fill-remaining ${isFullWidth ? "responsive top" : ""} ${isLeft ? "left" : ""}`;
  //   return (
  //     <div className={containerClass} style={position} ref={elt => this.primaryDivRef = elt}>
  //       {this.renderEmbeddables(embeddables, EmbeddableSections.Interactive, totalPreviousQuestions)}
  //     </div>
  //   );
  // }

  // private renderSecondaryEmbeddables = (embeddables: EmbeddableWrapper[], totalPreviousQuestions: number, layout: string, isLeft: boolean, collapsible: boolean) => {
  //   const { isSecondaryCollapsed } = this.state;
  //   const isFullWidth = layout === PageLayouts.FullWidth;
  //   const staticWidth = layout === PageLayouts.FortySixty || layout === PageLayouts.SixtyForty || layout === PageLayouts.Responsive;
  //   const containerClass = `group ${isFullWidth ? "responsive" : ""} ${isLeft ? "left" : ""} ${staticWidth ? "static-width" : ""} ${isSecondaryCollapsed ? "collapsed" : ""}`;
  //   return (
  //     <div className={containerClass} ref={elt => this.secondaryDivRef = elt}>
  //       {collapsible && this.renderCollapsibleHeader()}
  //       {!isSecondaryCollapsed && this.renderEmbeddables(embeddables, EmbeddableSections.InfoAssessment, totalPreviousQuestions)}
  //     </div>
  //   );
  // }

  // private renderCollapsibleHeader = () => {
  //   const { isSecondaryCollapsed } = this.state;
  //   const { page } = this.props;
  //   const rightOrientation = page.layout === PageLayouts.FortySixty;
  //   const headerClass = `collapsible-header ${isSecondaryCollapsed ? "collapsed" : ""} ${rightOrientation ? "right" : ""}`;
  //   return (
  //     <div className={headerClass} data-cy="collapsible-header" tabIndex={0}
  //           onClick={this.handleCollapseHeader} onKeyDown={this.handleCollapseHeader} >
  //       {isSecondaryCollapsed
  //         ? <React.Fragment>
  //             {this.renderCollapseArrow(rightOrientation)}
  //             <div>Show</div>
  //           </React.Fragment>
  //         : <React.Fragment>
  //             {rightOrientation && <div>Hide</div>}
  //             {this.renderCollapseArrow(!rightOrientation)}
  //             {!rightOrientation && <div>Hide</div>}
  //           </React.Fragment>
  //       }
  //     </div>
  //   );
  // }

  // private renderCollapseArrow = (leftArrow: boolean) => {
  //   return (
  //     leftArrow
  //       ? <IconChevronLeft
  //         width={32}
  //         height={32}
  //         fill={"white"}
  //       />
  //       : <IconChevronRight
  //         width={32}
  //         height={32}
  //         fill={"white"}
  //       />
  //   );
  // }

  // private handleCollapseHeader = (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => {
  //   if (accessibilityClick(e))  {
  //     Logger.log({
  //       event: LogEventName.toggle_collapsible_column,
  //       parameters:{ hide_column: !this.state.isSecondaryCollapsed }
  //     });
  //     this.setState(state => ({ isSecondaryCollapsed: !state.isSecondaryCollapsed }));
  //   }
  // }

