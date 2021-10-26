import React from "react";
import { EmbeddableImperativeAPI } from "./embeddable";
import { Section } from "./section";
import { BottomButtons } from "./bottom-buttons";
import { numQuestionsOnPreviousSections } from "../../utilities/activity-utils";
import { Page, SectionType, EmbeddableWrapper } from "../../types";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../../lib/logger";
import { showReport } from "../../utilities/report-utils";

import "./activity-page-content.scss";

interface IProps {
  enableReportButton: boolean;
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

  public requestInteractiveStates() {
    const promises = this.props.page.sections.forEach((section: SectionType) =>
        section.embeddables.map((embeddableWrapper: EmbeddableWrapper) =>
          this.embeddableRefs[embeddableWrapper.embeddable.ref_id]?.current?.requestInteractiveState() || Promise.resolve()
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
    const {teacherEditionMode, setNavigation, pluginsLoaded} = this.props;
    return (
      sections.map((section, idx) => {
        const questionCount = numQuestionsOnPreviousSections(idx, sections) || 0;
        const embeddableQuestionNumberStart = questionCount + totalPreviousQuestions;
        if (!section.is_hidden) {
          return (
            <Section section={section}
                    key={`section-${idx}`}
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
}
