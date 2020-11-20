import React from "react";
import { PortalDataContext } from "./portal-data-context";
import { Header } from "./activity-header/header";
import { ActivityNavHeader } from "./activity-header/activity-nav-header";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import { Footer } from "./activity-introduction/footer";
import { ActivityLayouts, PageLayouts, numQuestionsOnPreviousPages, enableReportButton, setDocumentTitle } from "../utilities/activity-utils";
import { getActivityDefinition, getSequenceDefinition } from "../lara-api";
import { ThemeButtons } from "./theme-buttons";
import { SinglePageContent } from "./single-page/single-page-content";
import { WarningBanner } from "./warning-banner";
import { CompletionPageContent } from "./activity-completion/completion-page-content";
import { queryValue, queryValueBoolean } from "../utilities/url-query";
import { fetchPortalData, IPortalData } from "../portal-api";
import { signInWithToken, initializeDB, setPortalData, initializeAnonymousDB } from "../firebase-db";
import { Activity, IEmbeddablePlugin, Sequence } from "../types";
import { initializeLara, LaraGlobalType } from "../lara-plugin/index";
import { LaraGlobalContext } from "./lara-global-context";
import { loadPluginScripts, getGlossaryEmbeddable } from "../utilities/plugin-utils";
import { TeacherEditionBanner }  from "./teacher-edition-banner";
import { AuthError }  from "./auth-error/auth-error";
import { ExpandableContainer } from "./expandable-content/expandable-container";
import { SequenceIntroduction } from "./sequence-introduction/sequence-introduction";
import { ModalDialog } from "./modal-dialog";
import Modal from "react-modal";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../lib/logger";
import { GlossaryPlugin } from "../components/activity-page/plugins/glossary-plugin";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this
const kDefaultIncompleteMessage = "Please submit an answer first.";

interface IncompleteQuestion {
  refId: string;
  navOptions: INavigationOptions;
}

interface IState {
  activity?: Activity;
  currentPage: number;
  teacherEditionMode?: boolean;
  showThemeButtons?: boolean;
  username: string;
  authError: string;
  portalData?: IPortalData;
  sequence?: Sequence;
  showSequence?: boolean;
  isLastActivityInSequence?: boolean;
  activityIndex?: number;
  showModal: boolean;
  modalLabel: string
  incompleteQuestions: IncompleteQuestion[];
  pluginsLoaded: boolean;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  private LARA: LaraGlobalType;

  public constructor(props: IProps) {
    super(props);
    this.state = {
      currentPage: 0,
      teacherEditionMode: false,
      showThemeButtons: false,
      username: "Anonymous",
      authError: "",
      showModal: false,
      modalLabel: "",
      incompleteQuestions: [],
      pluginsLoaded: false,
    };
  }

  async componentDidMount() {
    try {
      const activityPath = queryValue("activity") || kDefaultActivity;
      const activity: Activity = await getActivityDefinition(activityPath);

      const sequencePath = queryValue("sequence");
      const sequence: Sequence | undefined = sequencePath ? await getSequenceDefinition(sequencePath) : undefined;
      const showSequence = sequence != null;

      // page 0 is introduction, inner pages start from 1 and match page.position in exported activity
      const currentPage = Number(queryValue("page")) || 0;

      const showThemeButtons = queryValueBoolean("themeButtons");
      const teacherEditionMode = queryValue("mode")?.toLowerCase( )=== "teacher-edition";
      // Teacher Edition mode is equal to preview mode. RunKey won't be used and the data won't be persisted.
      const preview = queryValueBoolean("preview") || teacherEditionMode;

      const newState: Partial<IState> = {activity, currentPage, showThemeButtons, showSequence, sequence, teacherEditionMode};
      setDocumentTitle(activity, currentPage);

      let classHash = "";
      let role = "unknown";
      let runRemoteEndpoint = "";

      if (queryValue("token")) {
        try {
          const portalData = await fetchPortalData();
          if (portalData.fullName) {
            newState.username = portalData.fullName;
          }
          if (portalData.userType) {
            role = portalData.userType;
          }
          if (portalData.contextId) {
            classHash = portalData.contextId;
          }
          if (portalData.runRemoteEndpoint) {
            runRemoteEndpoint = portalData.runRemoteEndpoint;
          }
          await initializeDB({ name: portalData.database.appName, preview: false });
          await signInWithToken(portalData.database.rawFirebaseJWT);
          this.setState({ portalData });

          setPortalData(portalData);
        } catch (err) {
          this.setState({ authError: err });
          console.error("Authentication Error: " + err);
        }
      } else {
        try {
          await initializeAnonymousDB(preview);
        } catch (err) {
          this.setState({ authError: err });
          console.error("Authentication Error: " + err);
        }
      }

      this.setState(newState as IState);

      this.LARA = initializeLara();
      loadPluginScripts(this.LARA, activity, this.handleLoadPlugins, teacherEditionMode);

      Modal.setAppElement("#app");

      Logger.initializeLogger(this.LARA, newState.username || this.state.username, role, classHash, teacherEditionMode, sequencePath, 0, sequencePath ? undefined : activityPath, currentPage, runRemoteEndpoint);

    } catch (e) {
      console.warn(e);
    }
  }

  render() {
    return (
      <LaraGlobalContext.Provider value={this.LARA}>
        <PortalDataContext.Provider value={this.state.portalData}>
          <div className="app" data-cy="app">
            <WarningBanner/>
            { this.state.teacherEditionMode && <TeacherEditionBanner/>}
            { this.state.showSequence
              ? <SequenceIntroduction sequence={this.state.sequence} username={this.state.username} onSelectActivity={this.handleSelectActivity} />
              : this.renderActivity() }
            { this.state.showThemeButtons && <ThemeButtons/>}
            <ModalDialog
              label={this.state.modalLabel}
              onClose={() => {this.setShowModal(false);}}
              showModal={this.state.showModal}
            />
          </div>
        </PortalDataContext.Provider>
      </LaraGlobalContext.Provider>
    );
  }

  private renderActivity = () => {
    const { activity, authError, currentPage, username, pluginsLoaded, teacherEditionMode } = this.state;
    if (!activity) return (<div>Loading</div>);
    const totalPreviousQuestions = numQuestionsOnPreviousPages(currentPage, activity);
    const fullWidth = (currentPage !== 0) && (activity.pages[currentPage - 1].layout === PageLayouts.Responsive);
    const glossaryEmbeddable: IEmbeddablePlugin | undefined = getGlossaryEmbeddable(activity);
    const isCompletionPage = currentPage > 0 && activity.pages[currentPage - 1].is_completion;
    return (
      <React.Fragment>
        <Header
          fullWidth={fullWidth}
          projectId={activity.project_id}
          userName={username}
          contentName={activity.name}
        />
        { authError
          ? <AuthError />
          : this.renderActivityContent(activity, currentPage, totalPreviousQuestions, fullWidth)
        }
        { (activity.layout === ActivityLayouts.SinglePage || currentPage === 0) &&
          <Footer
            fullWidth={fullWidth}
            projectId={activity.project_id}
          />
        }
        { (activity.layout === ActivityLayouts.SinglePage || !isCompletionPage) &&
          <ExpandableContainer
            activity={activity}
            pageNumber={currentPage}
            page={activity.pages.filter((page) => !page.is_hidden)[currentPage - 1]}
            teacherEditionMode={teacherEditionMode}
            pluginsLoaded={pluginsLoaded}
            glossaryPlugin={glossaryEmbeddable !== null}
          />
        }
        { glossaryEmbeddable && (activity.layout === ActivityLayouts.SinglePage || !isCompletionPage) &&
          <GlossaryPlugin embeddable={glossaryEmbeddable} pageNumber={currentPage} />
        }
      </React.Fragment>
    );
  }

  private renderActivityContent = (activity: Activity, currentPage: number, totalPreviousQuestions: number, fullWidth: boolean) => {
    return (
      <>
        { (activity.layout !== ActivityLayouts.SinglePage || this.state.sequence) &&
          <ActivityNavHeader
            activityPages={activity.pages}
            currentPage={currentPage}
            fullWidth={fullWidth}
            onPageChange={this.handleChangePage}
            singlePage={activity.layout === ActivityLayouts.SinglePage}
            sequenceName={this.state.sequence?.display_title || (this.state.sequence && "Sequence")}
            onShowSequence={this.handleShowSequence}
            lockForwardNav={this.state.incompleteQuestions.length > 0}
          />
        }
        { activity.layout === ActivityLayouts.SinglePage
          ? this.renderSinglePageContent(activity)
          : currentPage === 0
            ? this.renderIntroductionContent(activity)
            : activity.pages[currentPage - 1].is_completion
              ? this.renderCompletionContent(activity)
              : <ActivityPageContent
                  enableReportButton={currentPage === activity.pages.length && enableReportButton(activity)}
                  isFirstActivityPage={currentPage === 1}
                  isLastActivityPage={currentPage === activity.pages.filter((page) => !page.is_hidden).length}
                  pageNumber={currentPage}
                  onPageChange={this.handleChangePage}
                  page={activity.pages.filter((page) => !page.is_hidden)[currentPage - 1]}
                  totalPreviousQuestions={totalPreviousQuestions}
                  teacherEditionMode={this.state.teacherEditionMode}
                  setNavigation={this.handleSetNavigation}
                  key={`page-${currentPage}`}
                  lockForwardNav={this.state.incompleteQuestions.length > 0}
                  pluginsLoaded={this.state.pluginsLoaded}
                />
        }
      </>
    );
  }

  private renderSinglePageContent = (activity: Activity) => {
    return (
      <SinglePageContent
        activity={activity}
        teacherEditionMode={this.state.teacherEditionMode}
        pluginsLoaded={this.state.pluginsLoaded}
      />
    );
  }

  private renderIntroductionContent = (activity: Activity) => {
    return (
      <IntroductionPageContent
        activity={activity}
        onPageChange={this.handleChangePage}
      />
    );
  }

  private renderCompletionContent = (activity: Activity) => {
    console.log("activity: ", activity);
    return (
      <CompletionPageContent
        activityName={activity.name}
        isActivityComplete={true} // TODO: should be based on student progress
        onPageChange={this.handleChangePage}
        showStudentReport={activity.student_report_enabled}
        thumbnailURL={activity.thumbnail_url}
        onOpenReport={this.handleReport}
        sequence={this.state.sequence}
        isLastActivityInSequence={this.state.isLastActivityInSequence}
        activityIndex={this.state.activityIndex}
        onActivityChange={this.handleSelectActivity}
      />
    );
  }

  private handleChangePage = (page: number) => {
    const { currentPage, incompleteQuestions, activity } = this.state;
    if (page > currentPage && incompleteQuestions.length > 0) {
      const label = incompleteQuestions[0].navOptions?.message || kDefaultIncompleteMessage;
      this.setShowModal(true, label);
    } else if (page >= 0 && (activity && page <= activity.pages.length)) {
      this.setState({currentPage: page, incompleteQuestions: []});
      setDocumentTitle(activity, page);
      Logger.updateActivityPage(page);
      Logger.log({
        event: LogEventName.change_activity_page,
        parameters: { new_page: page }
      });
    }
  }

  private handleSelectActivity = (activityNum: number) => {
    Logger.updateSequenceActivityindex(activityNum + 1);
    Logger.log({
      event: LogEventName.change_sequence_activity,
      parameters: { new_activity_index: activityNum + 1, new_activity_name: this.state.sequence?.activities[activityNum].name }
    });
    this.setState((prevState) =>
      ({ activity: prevState.sequence?.activities[activityNum],
        showSequence: false,
        isLastActivityInSequence: prevState.sequence?.activities.length === activityNum + 1,
        activityIndex: activityNum
      })
    );
  }

  private handleShowSequence = () => {
    this.setState({showSequence: true});
    Logger.log({
      event: LogEventName.show_sequence_intro_page
    });
  }

  private setShowModal = (show: boolean, label = "") => {
    this.setState({showModal: show, modalLabel: label});
    Logger.log({
      event: LogEventName.toggle_modal_dialog,
      parameters: { show_modal: show, modal_label: label }
    });
  }

  private handleSetNavigation = (refId: string, options: INavigationOptions) => {
    const { incompleteQuestions } = this.state;
    const qIndex = incompleteQuestions.findIndex((q: IncompleteQuestion) => q.refId === refId);
    const updatedIncompleteQuestions = [...incompleteQuestions];
    if (qIndex >= 0 && options.enableForwardNav) {
      updatedIncompleteQuestions.splice(qIndex, 1);
      this.setState({ incompleteQuestions: updatedIncompleteQuestions });
    } else if (qIndex < 0 && !options.enableForwardNav) {
      const newIncompleteQuestion: IncompleteQuestion = { refId, navOptions: options };
      updatedIncompleteQuestions.push(newIncompleteQuestion);
      this.setState({ incompleteQuestions: updatedIncompleteQuestions });
    }
  }

  private handleLoadPlugins = () => {
    this.setState({ pluginsLoaded: true });
  }

}
