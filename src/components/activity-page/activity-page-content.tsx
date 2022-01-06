import React from "react";
import { EmbeddableImperativeAPI } from "./embeddable";
import { Section } from "./section";
import { BottomButtons } from "./bottom-buttons";
import { numQuestionsOnPreviousSections } from "../../utilities/activity-utils";
import { Page, EmbeddableType, SectionType } from "../../types";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../../lib/logger";
import { showReport } from "../../utilities/report-utils";

import "./activity-page-content.scss";

interface IProps {
  enableReportButton: boolean;
  activityLayout: number;
  page: Page;
  pageNumber: number;
  teacherEditionMode?: boolean;
  totalPreviousQuestions: number;
  setNavigation: (refId: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
}

export class ActivityPageContent extends React.PureComponent <IProps> {
  private primaryDivRef: HTMLDivElement | null;
  private secondaryDivRef: HTMLDivElement | null;
  private embeddableRefs: Record<string, React.RefObject<EmbeddableImperativeAPI>> = {};

  public constructor(props: IProps) {
    super(props);
  }

  render() {
    const { enableReportButton, page, totalPreviousQuestions } = this.props;
    const pageTitle = page.name || "";
    const sections = page.sections;
    const responsiveLayoutSections = sections.filter(s => s.layout.includes("responsive"));
    const isResponsiveLayout = responsiveLayoutSections.length > 0;

    return (
      <>
        {page.is_hidden && this.renderHiddenWarningBanner()}
        <div className={`page-content full ${isResponsiveLayout ? "responsive" : ""}`} data-cy="page-content">
          <div className="name">{ pageTitle }</div>
          {this.renderSections(sections, totalPreviousQuestions)}
          { enableReportButton &&
            <BottomButtons
              onGenerateReport={this.handleReport}
            />
          }
        </div>
      </>
    );
  }

  public requestInteractiveStates() {
    const promises: Promise<void>[] = [];
    this.props.page.sections.forEach((section: SectionType) =>
      section.embeddables.map((embeddable: EmbeddableType) =>
        promises.push(this.embeddableRefs[embeddable.ref_id]?.current?.requestInteractiveState() || Promise.resolve())
  )
);
    return promises;
  }

  private handleReport = () => {
    showReport();
    Logger.log({
      event: LogEventName.create_report
    });
  }

  private renderSections = (sections: SectionType[], totalPreviousQuestions: number) => {
    const {page, activityLayout, teacherEditionMode, setNavigation, pluginsLoaded} = this.props;
    return (
      sections.map((section, idx) => {
        const questionCount = numQuestionsOnPreviousSections(idx, sections) || 0;
        const embeddableQuestionNumberStart = questionCount + totalPreviousQuestions;
        if (!section.is_hidden) {
          return (
            <Section page = {page}
                    section={section}
                    key={`section-${idx}`}
                    activityLayout={activityLayout}
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

  private renderHiddenWarningBanner = () =>{
    return (
      <div className="hidden-page-warning">
        NOTE: This page is hidden from users
      </div>
    );
  }
}
