import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";
import classNames from "classnames";

import { Section, SectionImperativeAPI } from "./section";
import { BottomButtons } from "./bottom-buttons";
import { ActivityLayouts, numQuestionsOnPreviousSections } from "../../utilities/activity-utils";
import { Activity, Page, SectionType } from "../../types";
import { IGetInteractiveState, INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { QuestionInfoContext } from "../question-info-context";
import { answersQuestionIdToRefId } from "../../utilities/embeddable-utils";
import { watchQuestionLevelFeedback } from "../../firebase-db";
import { Logger, LogEventName } from "../../lib/logger";
import { showReport } from "../../utilities/report-utils";
import { IPageChangeNotification, PageChangeNotification } from "./page-change-notification";
import { ReadAloudToggle } from "../read-aloud-toggle";
import { TeacherFeedbackSmallBadge } from "../teacher-feedback/teacher-feedback-small-badge";

import "./activity-page-content.scss";

interface ISectionTabProps {
  label: string;
  zIndex: number;
  section: SectionType;
  selected: boolean;
  onSelected: (section: SectionType) => void;
  hasFeedback: boolean;
}

const SectionTab = (props: ISectionTabProps) => {
  const { label, zIndex, section, selected, onSelected, hasFeedback } = props;
  const className = classNames("section-tab", { selected });
  const handleClick = () => onSelected(section);
  const style: React.CSSProperties = {zIndex};

  return (
    <div className={className} style={style} onClick={handleClick}>
      {label}
      {hasFeedback && <TeacherFeedbackSmallBadge/>}
    </div>
  );
};

interface IProps {
  enableReportButton: boolean;
  activityLayout: number;
  page: Page;
  pageNumber: number;
  activity: Activity;
  teacherEditionMode?: boolean;
  totalPreviousQuestions: number;
  setNavigation: (refId: string, options: INavigationOptions) => void;
  pluginsLoaded: boolean;
  pageChangeNotification?: IPageChangeNotification;
  hideReadAloud?: boolean;
  hideQuestionNumbers?: boolean;
  addRefToQuestionMap?: (refId: string, ref: any) => void;
}

interface IState {
  selectedSection: SectionType | undefined;
  questionsWithFeedback: string[];
}

export class ActivityPageContent extends React.Component<IProps, IState> {
  static contextType = QuestionInfoContext;

  private sectionRefs: Record<string, React.RefObject<SectionImperativeAPI>> = {};
  private unsubscribeQuestionLevelFeedback?: () => void;

  public constructor(props: IProps) {
    super(props);

    this.state = {
      selectedSection: props.page.sections[0],
      questionsWithFeedback: []
    };
  }

  componentDidMount() {
    const { activity, page } = this.props;
    const { questionMap } = this.context;
    if (activity.id) {
      this.unsubscribeQuestionLevelFeedback = watchQuestionLevelFeedback(fbs => {
        const qIds: string[] = [];
        fbs.forEach(fb => {
          const eRefId = answersQuestionIdToRefId(fb.questionId);
          if (questionMap[eRefId]?.pageId === page.id) {
            qIds.push(eRefId);
          }
        });
        this.setState({ questionsWithFeedback: qIds });
      });
    }
  }

  componentWillUnmount() {
    this.unsubscribeQuestionLevelFeedback?.();
  }

  renderPageChangeNotification() {
    return <PageChangeNotification pageChangeNotification={this.props.pageChangeNotification} />;
  }

  render() {
    const { enableReportButton, page, totalPreviousQuestions } = this.props;
    const pageTitle = page.name || "";
    const sections = page.sections.filter(section => !section.is_hidden);
    const responsiveLayoutSections = sections.filter(s => s.layout.includes("responsive"));
    const isResponsiveLayout = responsiveLayoutSections.length > 0;
    const isNotebookLayout = this.props.activityLayout === ActivityLayouts.Notebook;
    const renderTabs = isNotebookLayout && sections.length > 1;

    // to allow the notebook.scss to hide the header if the read aloud is hidden
    const headerClass = classNames("header", {"contains-read-aloud": !this.props.hideReadAloud});

    return (
      <>
        {page.is_hidden && this.renderHiddenWarningBanner()}
        {this.renderPageChangeNotification()}
        <div className={`page-content full ${isResponsiveLayout ? "responsive" : ""}`} data-cy="page-content">
          <div className={headerClass}>
            <div className="name"><DynamicText>{pageTitle}</DynamicText></div>
            <ReadAloudToggle />
          </div>
          {isNotebookLayout && <div className="notebookHeader" />}
          <div className="sections">
            {renderTabs && this.renderTabs(sections)}
            {this.renderSections(sections, totalPreviousQuestions, renderTabs)}
          </div>
          {enableReportButton &&
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

  private renderSections = (sections: SectionType[], totalPreviousQuestions: number, renderTabs: boolean) => {
    const { page, activityLayout, teacherEditionMode, setNavigation, pluginsLoaded, hideQuestionNumbers, addRefToQuestionMap } = this.props;
    return (
      sections.map((section, idx) => {
        const questionCount = numQuestionsOnPreviousSections(idx, sections) || 0;
        const embeddableQuestionNumberStart = questionCount + totalPreviousQuestions;
        const hiddenTab = renderTabs && section !== this.state.selectedSection;
        if (!section.is_hidden) {
          // `idx` is not the best key, but it doesn't seem it could cause any problems here. Even if refs
          // are recreated, updated, or pointing to different sections over time, it shouldn't matter.
          if (!this.sectionRefs[idx]) {
            this.sectionRefs[idx] = React.createRef<SectionImperativeAPI>();
          }
          return (
            <Section page={page}
              ref={this.sectionRefs[idx]}
              section={section}
              key={`section-${idx}`}
              activityLayout={activityLayout}
              questionNumberStart={embeddableQuestionNumberStart}
              teacherEditionMode={teacherEditionMode}
              setNavigation={setNavigation}
              pluginsLoaded={pluginsLoaded}
              hiddenTab={hiddenTab}
              hideQuestionNumbers={hideQuestionNumbers}
              addRefToQuestionMap={addRefToQuestionMap}
            />
          );
        }
      })
    );
  }

  private renderHiddenWarningBanner = () => {
    return (
      <div className="hidden-page-warning">
        NOTE: This page is hidden from users
      </div>
    );
  }

  private renderTabs(sections: SectionType[]) {
    const { questionsWithFeedback } = this.state;
    return (
      <>
      <div className="section-tabs">
        {sections.map((section, i) => (
          <SectionTab
            key={i}
            hasFeedback={section.embeddables.some(e => questionsWithFeedback.includes(e.ref_id))}
            zIndex={sections.length - i}
            label={section.name || `Tab ${i + 1}`}
            section={section}
            selected={this.state.selectedSection === section}
            onSelected={this.handleSectionTabSelected.bind(this)}
          />
        ))}
      </div>
      <div className="separator"/>
      </>
    );
  }

  private handleSectionTabSelected(section: SectionType) {
    this.setState({ selectedSection: section });
  }
}
