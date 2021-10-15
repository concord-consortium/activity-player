import React from "react";
import Modal from "react-modal";
import { PortalDataContext } from "./portal-data-context";
import { Header } from "./activity-header/header";
import { ActivityNav } from "./activity-header/activity-nav";
import { SequenceNav } from "./activity-header/sequence-nav";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import { Footer } from "./activity-introduction/footer";
import { ActivityLayouts, numQuestionsOnPreviousPages,
  enableReportButton, setDocumentTitle, getPagePositionFromQueryValue,
  getSequenceActivityFromQueryValue, getSequenceActivityId,
  setAppBackgroundImage } from "../utilities/activity-utils";
import { getActivityDefinition, getSequenceDefinition } from "../lara-api";
import { ThemeButtons } from "./theme-buttons";
import { SinglePageContent } from "./single-page/single-page-content";
import { WarningBanner } from "./warning-banner";
import { CompletionPageContent } from "./activity-completion/completion-page-content";
import { queryValue, queryValueBoolean, setQueryValue } from "../utilities/url-query";
import { fetchPortalData, firebaseAppName } from "../portal-api";
import { IPortalData, IPortalDataUnion } from "../portal-types";
import { signInWithToken, initializeDB, setPortalData, initializeAnonymousDB,
         onFirestoreSaveTimeout, onFirestoreSaveAfterTimeout, getPortalData } from "../firebase-db";
import { Activity, IEmbeddablePlugin, Sequence } from "../types";
import { initializeLara, LaraGlobalType } from "../lara-plugin/index";
import { LaraGlobalContext } from "./lara-global-context";
import { loadPluginScripts, getGlossaryEmbeddable, loadLearnerPluginState } from "../utilities/plugin-utils";
import { TeacherEditionBanner }  from "./teacher-edition-banner";
import { Error }  from "./error/error";
import { IdleWarning } from "./error/idle-warning";
import { ExpandableContainer } from "./expandable-content/expandable-container";
import { SequenceIntroduction } from "./sequence-introduction/sequence-introduction";
import { ModalDialog } from "./modal-dialog";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../lib/logger";
import { GlossaryPlugin } from "../components/activity-page/plugins/glossary-plugin";
import { getAttachmentsManagerOptions} from "../utilities/get-attachments-manager-options";
import { IdleDetector } from "../utilities/idle-detector";
import { initializeAttachmentsManager } from "@concord-consortium/interactive-api-host";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this
const kDefaultIncompleteMessage = "Please submit an answer first.";

// User will see the idle warning after kMaxIdleTime
const kMaxIdleTime = 20 * 60 * 1000; // 20 minutes
// User session will timeout after kMaxIdleTime + kTimeout
const kTimeout = 5 * 60 * 1000; // 5 minutes

const kLearnPortalUrl = "https://learn.concord.org";

const kAnonymousUserName = "Anonymous";

export type ErrorType = "auth" | "network" | "timeout";

interface IncompleteQuestion {
  refId: string;
  navOptions: INavigationOptions;
}

interface IState {
  activity?: Activity;
  currentPage: number;
  teacherEditionMode?: boolean;
  showThemeButtons?: boolean;
  showWarning: boolean;
  username: string;
  portalData?: IPortalData;
  sequence?: Sequence;
  showSequenceIntro?: boolean;
  activityIndex?: number;
  showModal: boolean;
  modalLabel: string
  incompleteQuestions: IncompleteQuestion[];
  pluginsLoaded: boolean;
  errorType: null | ErrorType;
  idle: boolean;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  private LARA: LaraGlobalType;
  private activityPageContentRef = React.createRef<ActivityPageContent>();

  public constructor(props: IProps) {
    super(props);
    this.state = {
      activityIndex: 0,
      currentPage: 0,
      teacherEditionMode: false,
      showThemeButtons: false,
      showWarning: false,
      username: kAnonymousUserName,
      showModal: false,
      modalLabel: "",
      incompleteQuestions: [],
      pluginsLoaded: false,
      errorType: null,
      idle: false
    };
  }

  public get portalUrl() {
    return this.state.portalData?.platformId || kLearnPortalUrl;
  }

  public setError(errorType: ErrorType | null, error?: any) {
    this.setState({ errorType });
    if (errorType) {
      console.error(errorType + " error:", error);
    }
  }

  async componentDidMount() {
    try {
      const sequencePath = queryValue("sequence");
      const sequence: Sequence | undefined = sequencePath ? await getSequenceDefinition(sequencePath) : undefined;
      const sequenceActivityNum = sequence != null
                                    ? getSequenceActivityFromQueryValue(sequence, queryValue("sequenceActivity"))
                                    : 0;
      const activityIndex = sequence && sequenceActivityNum ? sequenceActivityNum - 1 : undefined;
      const activityPath = queryValue("activity") || kDefaultActivity;
      const activity: Activity = sequence != null && activityIndex != null && activityIndex >= 0
                                   ? sequence.activities[activityIndex]
                                   : await getActivityDefinition(activityPath);

      const showSequenceIntro = sequence != null && sequenceActivityNum < 1;

      // page 0 is introduction, inner pages start from 1 and match page.position in exported activity if numeric
      // or the page.position of the matching page id if prefixed with "page_<id>"
      const currentPage = getPagePositionFromQueryValue(activity, queryValue("page"));

      const showThemeButtons = queryValueBoolean("themeButtons");
      // Show the warning if we are not running on production
      const showWarning = firebaseAppName() !== "report-service-pro";
      const teacherEditionMode = queryValue("mode")?.toLowerCase( )=== "teacher-edition";
      // Teacher Edition mode is equal to preview mode. RunKey won't be used and the data won't be persisted.
      const preview = queryValueBoolean("preview") || teacherEditionMode;

      const newState: Partial<IState> = {activity, activityIndex, currentPage, showThemeButtons, showWarning, showSequenceIntro, sequence, teacherEditionMode};
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
          this.setError("auth", err);
        }
      } else {
        try {
          await initializeAnonymousDB(preview);
        } catch (err) {
          this.setError("auth", err);
        }
      }

      getAttachmentsManagerOptions(getPortalData() as IPortalDataUnion).then(options => {
        initializeAttachmentsManager(options);
      });

      if (!preview) {
        // Notify user about network issues. Note that in preview mode Firestore network is disabled, so it doesn't
        // make sense to track requests.
        onFirestoreSaveTimeout(() => this.state.errorType === null && this.setError("network"));
        // Notify user when network issues are resolved.
        onFirestoreSaveAfterTimeout(() => this.state.errorType === "network" && this.setError(null));
      }

      this.setState(newState as IState);

      this.LARA = initializeLara();
      const activities: Activity[] = sequence ? sequence.activities : [activity];
      loadLearnerPluginState(activities).then(() => {
        loadPluginScripts(this.LARA, activities, this.handleLoadPlugins);
      });

      Modal.setAppElement("#app");

      Logger.initializeLogger({
        LARA: this.LARA,
        username: (() => {
          let username = newState.username || this.state.username;
          const domain = queryValue("domain");
          const domainUID = queryValue("domain_uid");
          // If user is anonymous, but there are domain and domain_uid URL params available, use them to construct an username.
          // PJ 9/2/2021: This might be replaced by a proper OAuth path in the future. For now, it les us log teacher edition events correctly.
          if (username === kAnonymousUserName && domain && domainUID) {
            // Skip protocol, use hostname only to mimic LARA behavior.
            username = `${domainUID}@${new URL(domain).hostname}`;
          }
          return username;
        })(),
        role,
        classHash,
        teacherEdition: teacherEditionMode,
        sequence: sequencePath,
        sequenceActivityIndex: 0,
        // Note that we're setting activity param to `sequencePath || activityPath`. This is intentional.
        // When AP is rendering a sequence, the sequence JSON path should be used as an `activity` param value.
        // That's the most important parameter for log-puller which always checks `activity` and ignores `sequence`.
        // Other systems like LARA or Portal Report provide `activity` param equal to "sequence: <ID>".
        activity: sequencePath || activityPath,
        activityPage: currentPage,
        runRemoteEndpoint,
        env: firebaseAppName() === "report-service-pro" ? "production" : "dev"
      });

      const idleDetector = new IdleDetector({ idle: Number(kMaxIdleTime), onIdle: this.handleIdleness });
      idleDetector.start();
    } catch (e) {
      console.warn(e);
    }
  }

  render() {
    return (
      <LaraGlobalContext.Provider value={this.LARA}>
        <PortalDataContext.Provider value={this.state.portalData}>
          <div className="app" data-cy="app">
            { this.state.showWarning && <WarningBanner/> }
            { this.state.teacherEditionMode && <TeacherEditionBanner/>}
            { this.state.showSequenceIntro
              ? <SequenceIntroduction sequence={this.state.sequence} username={this.state.username} onSelectActivity={this.handleSelectActivity} />
              : this.renderActivity() }
            { this.state.showThemeButtons && <ThemeButtons/>}
            <div className="version-info" data-cy="version-info">{(window as any).__appVersionInfo || "(No Version Info)"}</div>
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
    const { activity, activityIndex, idle, errorType, currentPage, username, pluginsLoaded, teacherEditionMode, sequence, portalData } = this.state;
    if (!activity) return (<div>Loading</div>);
    const totalPreviousQuestions = numQuestionsOnPreviousPages(currentPage, activity);
    const hasResponsiveSection = activity.pages[currentPage - 1]?.sections.filter(s => s.layout === "responsive");

    const fullWidth = (currentPage !== 0) && (hasResponsiveSection.length > 0);
    const project = activity.project ? activity.project : null;
    const glossaryEmbeddable: IEmbeddablePlugin | undefined = getGlossaryEmbeddable(activity);
    const isCompletionPage = currentPage > 0 && activity.pages[currentPage - 1].is_completion;
    const sequenceActivityId = sequence !== undefined ? getSequenceActivityId(sequence, activityIndex) : undefined;
    const sequenceActivity = sequenceActivityId !== undefined
                               ? sequenceActivityId
                               : activityIndex !== undefined && activityIndex >= 0
                                 ? activityIndex + 1
                                 : undefined;
    sequenceActivity !== undefined && setQueryValue("sequenceActivity", sequenceActivity);
    const backgroundImage = sequence?.background_image || activity.background_image;
    if (backgroundImage) {
      setAppBackgroundImage(backgroundImage);
    }

    return (
      <React.Fragment>
        <Header
          fullWidth={fullWidth}
          project={project}
          userName={username}
          contentName={sequence ? sequence.display_title || sequence.title || "" : activity.name}
          showSequence={sequence !== undefined}
          onShowSequence={sequence !== undefined ? this.handleShowSequenceIntro : undefined}
        />
        {
          idle && !errorType &&
          <IdleWarning
            // __cypressLoggedIn is used to trigger logged in code path for Cypress tests.
            // Eventually it should be replaced with better patterns for testing logged in users (probably via using
            // `token` param and stubbing network requests).
            timeout={kTimeout} username={username} anonymous={!portalData && queryValue("__cypressLoggedIn") !== "true"}
            onTimeout={this.handleTimeout} onContinue={this.handleContinueSession} onExit={this.goToPortal}
          />
        }
        { errorType && <Error type={errorType} onExit={this.goToPortal} /> }
        {
          !idle && !errorType &&
          this.renderActivityContent(activity, currentPage, totalPreviousQuestions, fullWidth)
        }
        { (activity.layout === ActivityLayouts.SinglePage || currentPage === 0) &&
          <Footer
            fullWidth={fullWidth}
            project={project}
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
          <GlossaryPlugin embeddable={glossaryEmbeddable} pageNumber={currentPage} pluginsLoaded={pluginsLoaded} />
        }
      </React.Fragment>
    );
  }

  private renderActivityContent = (activity: Activity, currentPage: number, totalPreviousQuestions: number, fullWidth: boolean) => {
    return (
      <>
        { this.state.sequence && this.renderSequenceNav(fullWidth) }
        { (activity.layout !== ActivityLayouts.SinglePage || this.state.sequence) &&
          this.renderNav(activity, currentPage, fullWidth)
        }
        { activity.layout === ActivityLayouts.SinglePage
          ? this.renderSinglePageContent(activity)
          : currentPage === 0
            ? this.renderIntroductionContent(activity)
            : activity.pages.filter((page) => !page.is_hidden)[currentPage - 1].is_completion
              ? this.renderCompletionContent(activity)
              : <ActivityPageContent
                  ref={this.activityPageContentRef}
                  enableReportButton={currentPage === activity.pages.length && enableReportButton(activity)}
                  pageNumber={currentPage}
                  page={activity.pages.filter((page) => !page.is_hidden)[currentPage - 1]}
                  totalPreviousQuestions={totalPreviousQuestions}
                  teacherEditionMode={this.state.teacherEditionMode}
                  setNavigation={this.handleSetNavigation}
                  key={`page-${currentPage}`}
                  pluginsLoaded={this.state.pluginsLoaded}
                />
        }
        { (activity.layout !== ActivityLayouts.SinglePage || this.state.sequence) &&
          this.renderNav(activity, currentPage, fullWidth)
        }
      </>
    );
  }

  private renderNav = (activity: Activity, currentPage: number, fullWidth: boolean) => {
    return (
      <ActivityNav
        activityPages={activity.pages}
        currentPage={currentPage}
        fullWidth={fullWidth}
        onPageChange={this.handleChangePage}
        singlePage={activity.layout === ActivityLayouts.SinglePage}
        lockForwardNav={this.state.incompleteQuestions.length > 0}
      />
    );
  }

  private renderSequenceNav = (fullWidth: boolean) => {
    const { activity, activityIndex, sequence } = this.state;
    const activityNum = activityIndex ? activityIndex + 1 : 1;
    const currentActivity = activity && activityNum + ": " + activity.name;
    return (
      <SequenceNav
        activities={sequence?.activities.map((a: Activity) => a.name)}
        currentActivity={currentActivity}
        fullWidth={fullWidth}
        onActivityChange={this.handleSelectActivity}
      />
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
    return (
      <CompletionPageContent
        activity={activity}
        activityName={activity.name}
        onPageChange={this.handleChangePage}
        showStudentReport={activity.student_report_enabled}
        sequence={this.state.sequence}
        activityIndex={this.state.activityIndex}
        onActivityChange={this.handleSelectActivity}
        onShowSequence={this.handleShowSequenceIntro}
      />
    );
  }

  private handleIdleness = () => {
    if (!this.state.idle) {
      // Check current idle value to avoid logging unnecessary "show_idle_warning" events.
      // Idle detector will keep working even after session timeout.
      Logger.log({ event: LogEventName.show_idle_warning });
      this.setState({ idle: true });
    }
  }

  private handleTimeout = () => {
    Logger.log({ event: LogEventName.session_timeout });
    this.setState({ errorType: "timeout" });
  }

  private handleContinueSession = () => {
    Logger.log({ event: LogEventName.continue_session });
    // Note that we don't have to restart IdleDetector. Any action that user has taken to continue session will
    // be detected and IdleDetector will start counting time again.
    this.setState({ idle: false });
  }

  private goToPortal = () => {
    Logger.log({ event: LogEventName.go_back_to_portal });
    window.location.href = this.portalUrl;
  }

  private handleChangePage = (page: number) => {
    const { currentPage, incompleteQuestions, activity } = this.state;
    if (page > currentPage && incompleteQuestions.length > 0) {
      const label = incompleteQuestions[0].navOptions?.message || kDefaultIncompleteMessage;
      this.setShowModal(true, label);
    } else if (page >= 0 && (activity && page <= activity.pages.length)) {
      const navigateAway = () => {
        this.setState({ currentPage: page, incompleteQuestions: [] });
        setDocumentTitle(activity, page);
        Logger.updateActivityPage(page);
        Logger.log({
          event: LogEventName.change_activity_page,
          parameters: { new_page: page }
        });
      };
      // Make sure that interactive state is saved before user can navigate away.
      const promises = this.activityPageContentRef.current?.requestInteractiveStates() || [Promise.resolve()];
      Promise.all(promises)
        .then(navigateAway)
        .catch(error => {
          // Notify user about error, but change page anyway.
          window.alert(error);
          navigateAway();
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
         showSequenceIntro: false,
         activityIndex: activityNum,
         currentPage: 0
      })
    );
  }

  private handleShowSequenceIntro = () => {
    this.setState({showSequenceIntro: true});
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
