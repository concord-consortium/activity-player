import React from "react";
import { Section, SectionImperativeAPI } from "./section";
import { BottomButtons } from "./bottom-buttons";
import { numQuestionsOnPreviousSections } from "../../utilities/activity-utils";
import { Page, SectionType } from "../../types";
import { IGetInteractiveState, INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../../lib/logger";
import { showReport } from "../../utilities/report-utils";
import { IPageChangeNotification, PageChangeNotification } from "./page-change-notification";
import { Toggle } from "./toggle";

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
  pageChangeNotification?: IPageChangeNotification;
  readAloud?: boolean;
  setReadAloud?: (readAloud: boolean) => void;
  readAloudDisabled?: boolean;
}

export class ActivityPageContent extends React.PureComponent <IProps> {
  private sectionRefs: Record<string, React.RefObject<SectionImperativeAPI>> = {};

  public constructor(props: IProps) {
    super(props);
  }

  renderPageChangeNotification() {
    return <PageChangeNotification pageChangeNotification={this.props.pageChangeNotification} />;
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
        {this.renderPageChangeNotification()}
        <div className={`page-content full ${isResponsiveLayout ? "responsive" : ""}`} data-cy="page-content">
          <div className="header">
            <div className="name">{ pageTitle }</div>
            {this.props.setReadAloud && <Toggle
              id="read_aloud_toggle"
              label="Tap text to listen"
              disabled={this.props.readAloudDisabled}
              disabledMessage="Text to speech not available on this browser."
              isChecked={this.props.readAloud || false}
              onChange={this.props.setReadAloud}
            />}
          </div>
          {this.renderSections(sections, totalPreviousQuestions)}
          { enableReportButton &&
            <BottomButtons
              onGenerateReport={this.handleReport}
            />
          }
        </div>
        {this.renderPageChangeNotification()}
      </>
    );
  }

  public requestInteractiveStates(options?: IGetInteractiveState) {
    const promises: Promise<void>[] = [];
    this.props.page.sections.forEach((section: SectionType, idx: number) =>
      promises.push(...(this.sectionRefs[idx]?.current?.requestInteractiveStates(options) || [Promise.resolve()]))
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
          // `idx` is not the best key, but it doesn't seem it could cause any problems here. Even if refs
          // are recreated, updated, or pointing to different sections over time, it shouldn't matter.
          if (!this.sectionRefs[idx]) {
            this.sectionRefs[idx] = React.createRef<SectionImperativeAPI>();
          }
          return (
            <Section page = {page}
                    ref={this.sectionRefs[idx]}
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
