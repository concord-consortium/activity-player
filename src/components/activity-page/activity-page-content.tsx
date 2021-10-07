import React from "react";
import classNames from "classnames";
import { Embeddable, EmbeddableImperativeAPI } from "./embeddable";
import { BottomButtons } from "./bottom-buttons";
import { isQuestion,  getLinkedPluginEmbeddable, numQuestionsOnPreviousSections } from "../../utilities/activity-utils";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import IconChevronRight from "../../assets/svg-icons/icon-chevron-right.svg";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";
import { Page, EmbeddableType, SectionType } from "../../types";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../../lib/logger";
import { showReport } from "../../utilities/report-utils";

import "./activity-page-content.scss";
import { Section } from "./section";

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
  isSecondaryCollapsed: boolean;
}

export class ActivityPageContent extends React.PureComponent <IProps, IState> {
  private primaryDivRef: HTMLDivElement | null;
  private secondaryDivRef: HTMLDivElement | null;
  private embeddableRefs: Record<string, React.RefObject<EmbeddableImperativeAPI>> = {};

  public constructor(props: IProps) {
    super(props);
    // this.state = {
    //   scrollOffset: 0,
    //   isSecondaryCollapsed: false,
    // };
  }

  render() {
    const { enableReportButton, page, totalPreviousQuestions } = this.props;
    const pageTitle = page.name || "";
    const sections = page.sections;
    const responsiveLayoutSections = sections.filter(s => s.layout === "responsive");
    const isResponsiveLayout = responsiveLayoutSections.length > 0;

    return (
      <div className={`page-content full ${isResponsiveLayout ? "responsive" : ""}`} data-cy="page-content">
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

  // public componentDidMount() {
  //   const el = document.querySelector("#app");
  //   if (el) {
  //     el.addEventListener("scroll", this.handleScroll, false);
  //     el.scrollTo(0, 0);
  //   }
  // }

  // public componentWillUnmount() {
  //   const el = document.querySelector("#app");
  //   if (el) {
  //     el.removeEventListener("scroll", this.handleScroll, false);
  //   }
  // }

  public requestInteractiveStates() {
    const promises = this.props.page.sections.forEach((section: SectionType) =>
        section.embeddables.map((embeddable: EmbeddableType) =>
          this.embeddableRefs[embeddable.ref_id]?.current?.requestInteractiveState() || Promise.resolve()
      )
    );
    return promises;
  }

  // private handleScroll = (e: MouseEvent) => {
  //   if (this.secondaryDivRef) {
  //     const secondaryHeight = this.secondaryDivRef.getBoundingClientRect().height;
  //     const primaryHeight = this.primaryDivRef?.getBoundingClientRect().height;
  //     const potentialScrollOffset = this.secondaryDivRef.getBoundingClientRect().top < kPinMargin
  //       ? kPinMargin - this.secondaryDivRef.getBoundingClientRect().top
  //       : 0;
  //     const scrollOffset = primaryHeight && (potentialScrollOffset + primaryHeight) > secondaryHeight
  //                           ? potentialScrollOffset
  //                           : 0;
  //     this.setState({ scrollOffset });
  //   }
  // }

  private handleReport = () => {
    showReport();
    Logger.log({
      event: LogEventName.create_report
    });
  }

  private renderSections = (sections: SectionType[], totalPreviousQuestions: number) => {
    const {teacherEditionMode, setNavigation, pluginsLoaded} = this.props;
    console.log("in renderSections");
    return (
      sections.map((section, idx) => {
        const questionCount = numQuestionsOnPreviousSections(idx, sections) || 0;
        const embeddableQuestionNumberStart = questionCount + totalPreviousQuestions;
        if (!section.is_hidden) {
          // return this.renderSection(section, embeddableQuestionNumberStart, idx);
          return (
            <Section section={section}
                    index={idx}
                    questionNumberStart={embeddableQuestionNumberStart}
                    teacherEditionMode={teacherEditionMode}
                    setNavigation={setNavigation}
                    pluginsLoaded={pluginsLoaded}
            />
          );
        }
      })
    );
  }

  // private renderSection = (section: SectionType, questionNumberStart: number, idx: number) => {
  //   const { scrollOffset } = this.state;
  //   const layout = section.layout;
  //   const display_mode = section.secondary_column_display_mode;
  //   const sectionClass = classNames("section",
  //                                   {"full-width": layout === "full-width"},
  //                                   {"l_6040": layout === "l-6040"},
  //                                   {"r_6040": layout === "r-6040"},
  //                                   {"l_7030": layout === "l-7030"},
  //                                   {"r_3070": layout === "r-3070"},
  //                                   {"responsive": layout === "responsive"},
  //                                   {"stacked": display_mode === "stacked"},
  //                                   {"carousel": display_mode === "carousel"}
  //                                  );
  //   const embeddables = section.embeddables;
  //   const primaryEmbeddables = embeddables.filter(e => e.column === "primary" && !e.is_hidden);
  //   const secondaryEmbeddables = embeddables.filter(e => e.column === "secondary" && !e.is_hidden);
  //   const singleColumn = layout === "full-width" ||
  //                         (layout === "responsive" && primaryEmbeddables.length === 0 && secondaryEmbeddables.length === 0);
  //   const pinOffSet = layout !== "full-width" && secondaryEmbeddables.length ? scrollOffset : 0;

  //   if (singleColumn) {
  //     return (
  //       <div key={`section_${idx}`} className = {sectionClass}>
  //         { this.renderEmbeddables(section, embeddables, questionNumberStart) }
  //       </div>
  //     );
  //   } else {
  //     const leftColumnEmbeddables = layout.includes("l") ? primaryEmbeddables : secondaryEmbeddables;
  //     const rightColumnEmbeddables = layout.includes("l") ? secondaryEmbeddables : primaryEmbeddables;
  //     const numQuestionsLeftColumn = layout.includes("l") ? primaryEmbeddables.length : secondaryEmbeddables.length;
  //     const rightColumnQuestionNumberStart = questionNumberStart + numQuestionsLeftColumn;
  //     return (
  //       <div key={`section_${idx}`} className = {sectionClass}>
  //         {layout.includes("l")
  //           ? this.renderPrimaryEmbeddables(section, leftColumnEmbeddables, questionNumberStart, pinOffSet)
  //           : this.renderSecondaryEmbeddables(section, leftColumnEmbeddables, questionNumberStart)
  //         }
  //         {layout.includes("l")
  //           ? this.renderSecondaryEmbeddables(section, rightColumnEmbeddables, rightColumnQuestionNumberStart)
  //           : this.renderPrimaryEmbeddables(section, rightColumnEmbeddables, rightColumnQuestionNumberStart, pinOffSet)
  //         }
  //       </div>
  //     );
  //   }
  // }

  // private renderEmbeddables = (section: SectionType, embeddables: EmbeddableType[], questionNumberStart: number, pinOffSet?: number) => {
  //   let questionNumber = questionNumberStart;
  //   return (
  //     <React.Fragment>
  //       { embeddables.map((embeddable, embeddableIndex) => {
  //           if (isQuestion(embeddable)) {
  //             questionNumber++;
  //           }
  //           const linkedPluginEmbeddable = getLinkedPluginEmbeddable(section, embeddable.ref_id);
  //           if (!this.embeddableRefs[embeddable.ref_id]) {
  //             this.embeddableRefs[embeddable.ref_id] = React.createRef<EmbeddableImperativeAPI>();
  //           }
  //           return (
  //             <Embeddable
  //               ref={this.embeddableRefs[embeddable.ref_id]}
  //               key={`embeddable-${embeddableIndex}-${embeddable.ref_id}`}
  //               embeddable={embeddable}
  //               sectionLayout={section.layout}
  //               displayMode={section.secondary_column_display_mode}
  //               questionNumber={isQuestion(embeddable) ? questionNumber : undefined}
  //               linkedPluginEmbeddable={linkedPluginEmbeddable}
  //               teacherEditionMode={this.props.teacherEditionMode}
  //               setNavigation={this.props.setNavigation}
  //               pluginsLoaded={this.props.pluginsLoaded}
  //               pinOffSet={pinOffSet}
  //             />
  //           );
  //         })
  //       }
  //     </React.Fragment>
  //   );
  // }

  // private renderPrimaryEmbeddables = (section: SectionType, embeddables: EmbeddableType[], questionNumberStart: number, pinOffset: number) => {
  //   const { isSecondaryCollapsed } = this.state;
  //   const position = { top: pinOffset };
  //   const layout = section.layout;
  //   const containerClass = classNames("column", layout, "primary", {"expand": isSecondaryCollapsed});
  //   return (
  //     <div className={containerClass} style={position} ref={elt => this.primaryDivRef = elt}>
  //       {this.renderEmbeddables(section, embeddables, questionNumberStart, pinOffset)}
  //     </div>
  //   );
  // }

  // private renderSecondaryEmbeddables = (section: SectionType, embeddables: EmbeddableType[], questionNumberStart: number) => {
  //   const { isSecondaryCollapsed } = this.state;
  //   const layout = section.layout;
  //   const collapsible = section.secondary_column_collapsible;
  //   const containerClass = classNames("column", layout, "secondary", {"collapsed": isSecondaryCollapsed});
  //   return (
  //     <div className={containerClass} ref={elt => this.secondaryDivRef = elt}>
  //       {collapsible && this.renderCollapsibleHeader(section)}
  //       {!isSecondaryCollapsed && this.renderEmbeddables(section, embeddables, questionNumberStart)}
  //     </div>
  //   );
  // }

  // private renderCollapsibleHeader = (section: SectionType) => {
  //   const { isSecondaryCollapsed } = this.state;
  //   const rightOrientation = section.layout.includes("l");
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

}
