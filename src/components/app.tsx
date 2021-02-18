import React from "react";
import { PortalDataContext } from "./portal-data-context";
import { Header } from "./activity-header/header";
import { ActivityNav } from "./activity-header/activity-nav";
import { SequenceNav } from "./activity-header/sequence-nav";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import { Footer } from "./activity-introduction/footer";
import { ActivityLayouts, PageLayouts, numQuestionsOnPreviousPages, enableReportButton, setDocumentTitle, getPagePositionFromQueryValue, getAllUrlsInActivity } from "../utilities/activity-utils";
import { getActivityDefinition, getSequenceDefinition } from "../lara-api";
import { ThemeButtons } from "./theme-buttons";
import { SinglePageContent } from "./single-page/single-page-content";
import { WarningBanner } from "./warning-banner";
import { CompletionPageContent } from "./activity-completion/completion-page-content";
import { queryValue, queryValueBoolean } from "../utilities/url-query";
import { fetchPortalData, IPortalData, firebaseAppName } from "../portal-api";
import { Storage } from "../storage-facade";
import { Activity, IEmbeddablePlugin, LaunchList, LaunchListActivity, Sequence } from "../types";
import { initializeLara, LaraGlobalType } from "../lara-plugin/index";
import { LaraGlobalContext } from "./lara-global-context";
import { loadPluginScripts, getGlossaryEmbeddable, loadLearnerPluginState } from "../utilities/plugin-utils";
import { TeacherEditionBanner }  from "./teacher-edition-banner";
import { Error }  from "./error/error";
import { IdleWarning } from "./error/idle-warning";
import { ExpandableContainer } from "./expandable-content/expandable-container";
import { SequenceIntroduction } from "./sequence-introduction/sequence-introduction";
import { ModalDialog } from "./modal-dialog";
import Modal from "react-modal";
import { INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName } from "../lib/logger";
import { GlossaryPlugin } from "../components/activity-page/plugins/glossary-plugin";
import { IdleDetector } from "../utilities/idle-detector";
import { messageSW, Workbox } from "workbox-window";
import { getLaunchList, getLaunchListAuthoringData, getLaunchListAuthoringId, getLaunchListId, LaunchListAuthoringData, mergeLaunchListWithAuthoringData, setLaunchListAuthoringData, setLaunchListAuthoringId, setLaunchListId } from "../launch-list-api";
import { LaunchListLoadingDialog } from "./launch-list-loading-dialog";
import { LaunchListLauncherDialog } from "./launch-list-launcher";
import { OfflineNav } from "./activity-header/offline-nav";
import { LaunchListAuthoringNav } from "./launch-list-authoring-nav";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this
const kDefaultIncompleteMessage = "Please submit an answer first.";

// User will see the idle warning after kMaxIdleTime
const kMaxIdleTime = 20 * 60 * 1000; // 20 minutes
// User session will timeout after kMaxIdleTime + kTimeout
const kTimeout = 5 * 60 * 1000; // 5 minutes

const kLearnPortalUrl = "https://learn.concord.org";

export type ErrorType = "auth" | "network" | "timeout";

interface IncompleteQuestion {
  refId: string;
  navOptions: INavigationOptions;
}

interface IState {
  activity?: Activity;
  launchList?: LaunchList;
  loadingLaunchList: boolean;
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
  offlineMode: boolean;
  launchListAuthoringId?: string;
  launchListAuthoringActivities: LaunchListActivity[];
  launchListAuthoringCacheList: string[];
  showLaunchListInstallConfimation: boolean;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  private LARA: LaraGlobalType;
  private activityPageContentRef = React.createRef<ActivityPageContent>();

  public constructor(props: IProps) {
    super(props);

    // set the launch list authoring localstorage item if it exists in the params and then read from localstorage
    // this is done in the constructor as the state value is needed in the UNSAFE_componentWillMount method
    setLaunchListAuthoringId(queryValue("setLaunchListAuthoringId"));
    const launchListAuthoringId = getLaunchListAuthoringId();

    this.state = {
      currentPage: 0,
      teacherEditionMode: false,
      showThemeButtons: false,
      showWarning: false,
      username: "Anonymous",
      showModal: false,
      modalLabel: "",
      incompleteQuestions: [],
      pluginsLoaded: false,
      errorType: null,
      idle: false,
      loadingLaunchList: false,
      offlineMode: (queryValue("offline") === "true") || !!launchListAuthoringId,
      launchListAuthoringActivities: [],
      launchListAuthoringCacheList: [],
      showLaunchListInstallConfimation: queryValue("confirmLaunchListInstall") === "true",
      launchListAuthoringId
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

  async UNSAFE_componentWillMount() {
    // only enable the service worker in offline mode (or in authoring mode which automatically turns on offline mode)
    const enableServiceWorker = this.state.offlineMode;

    if (enableServiceWorker && ("serviceWorker" in navigator)) {
      const wb = new Workbox("service-worker.js");
      let registration: ServiceWorkerRegistration | undefined;

      // TODO: in future work this should pop a dialog using this recipe:
      // https://developers.google.com/web/tools/workbox/guides/advanced-recipes#offer_a_page_reload_for_users
      // for now just send a message to always skip waiting so we don't have to do it manually in the devtools
      const alwaysSkipWaitingForNow = () => {
        if (registration?.waiting) {
          console.log("Sending SKIP_WAITING to service worker...");
          messageSW(registration.waiting, {type: "SKIP_WAITING"});
        }
      };

      // these are all events defined for workbox-window (https://developers.google.com/web/tools/workbox/modules/workbox-window)
      wb.addEventListener("installed", (event) => {
        console.log("A new service worker has installed.");
      });
      wb.addEventListener("waiting", (event) => {
        alwaysSkipWaitingForNow();
      });
      wb.addEventListener("externalwaiting" as any, (event) => {
        alwaysSkipWaitingForNow();
      });
      wb.addEventListener("controlling", (event) => {
        console.log("A new service worker has installed and is controlling.");
      });
      wb.addEventListener("activating", (event) => {
        console.log("A new service worker is activating.");
      });
      wb.addEventListener("activated", (event) => {
        if (!event.isUpdate) {
          console.log("Service worker activated for the first time!");
        }
      });
      wb.addEventListener("message", (event) => {
        const {launchListAuthoringId} = this.state;
        switch (event.data.type) {
          case "CACHE_UPDATED":
            console.log(`A newer version of ${event.data.payload.updatedURL} is available!`);
            break;

          case "GET_REQUEST":
            if (launchListAuthoringId) {
              this.setState((prevState) => {
                // make sure all models-resources requests use the base folder
                const url = event.data.url.replace(/.*models-resources\//, "models-resources/");
                let {launchListAuthoringCacheList} = prevState;
                const {launchListAuthoringActivities} = prevState;
                if (!/api\/v1\/activities/.test(url) && (launchListAuthoringCacheList.indexOf(url) === -1)) {
                  launchListAuthoringCacheList = launchListAuthoringCacheList.concat(url);
                }
                setLaunchListAuthoringData(launchListAuthoringId, {
                  activities: launchListAuthoringActivities,
                  cacheList: launchListAuthoringCacheList
                });
                return {...prevState, launchListAuthoringCacheList};
              });
            }
            break;
        }
      });

      wb.register().then((_registration) => {
        registration = _registration;
      });
    }
  }

  async componentDidMount() {
    try {
      const launchListAuthoringId = this.state.launchListAuthoringId;
      let launchListAuthoringData: LaunchListAuthoringData | undefined;
      if (launchListAuthoringId) {
        launchListAuthoringData = getLaunchListAuthoringData(launchListAuthoringId);
      }

      let launchList: LaunchList | undefined = undefined;
      const launchListId = queryValue("launchList") || (this.state.offlineMode ? getLaunchListId() : undefined);
      const loadingLaunchList = !!launchListId;
      if (launchListId) {
        launchList = await getLaunchList(launchListId);

        // save the launch list in offline mode so the PWA knows which launch list to show
        if (this.state.offlineMode) {
          setLaunchListId(launchListId);
        }

        // merge the launch list data into the saved data
        if (launchList && launchListAuthoringId && launchListAuthoringData) {
          launchListAuthoringData = mergeLaunchListWithAuthoringData(launchList, launchListAuthoringData);
          setLaunchListAuthoringData(launchListAuthoringId, launchListAuthoringData);
        }
      }

      if (launchListAuthoringData) {
        this.setState({
          launchListAuthoringActivities: launchListAuthoringData.activities,
          launchListAuthoringCacheList: launchListAuthoringData.cacheList
        });
      }

      let activity: Activity | undefined = undefined;
      const activityPath = queryValue("activity") || (launchList ? undefined : kDefaultActivity);
      if (activityPath) {
        activity = await getActivityDefinition(activityPath);
        if (launchListAuthoringId) {
          this.addActivityToLaunchList(launchListAuthoringId, activity, activityPath);
        }
      }

      const sequencePath = queryValue("sequence");
      const sequence: Sequence | undefined = sequencePath ? await getSequenceDefinition(sequencePath) : undefined;
      const showSequenceIntro = sequence != null;

      // page 0 is introduction, inner pages start from 1 and match page.position in exported activity if numeric
      // or the page.position of the matching page id if prefixed with "page_<id>"
      const currentPage = activity ? getPagePositionFromQueryValue(activity, queryValue("page")) : 0;

      const showThemeButtons = queryValueBoolean("themeButtons");
      // Show the warning if we are not running on production (disable for now)
      const showWarning = firebaseAppName() !== "report-service-pro";
      const teacherEditionMode = queryValue("mode")?.toLowerCase( )=== "teacher-edition";
      // Teacher Edition mode is equal to preview mode. RunKey won't be used and the data won't be persisted.
      const preview = queryValueBoolean("preview") || teacherEditionMode;

      const newState: Partial<IState> = {activity, launchList, loadingLaunchList, currentPage, showThemeButtons, showWarning, showSequenceIntro, sequence, teacherEditionMode, launchListAuthoringId};
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
          await Storage.initializeDB({ name: portalData.database.appName, preview: false });
          await Storage.signInWithToken(portalData.database.rawFirebaseJWT);
          this.setState({ portalData });

          Storage.setPortalData(portalData);
        } catch (err) {
          this.setError("auth", err);
        }
      // TDB: add else case to handle offline authentication when this.state.offlineMode is true
      } else {
        try {
          await Storage.initializeAnonymousDB(preview);
        } catch (err) {
          this.setError("auth", err);
        }
      }

      if (!preview) {
        // Notify user about network issues. Note that in preview mode Firestore network is disabled, so it doesn't
        // make sense to track requests.
        Storage.onFirestoreSaveTimeout(() => this.state.errorType === null && this.setError("network"));
        // Notify user when network issues are resolved.
        Storage.onFirestoreSaveAfterTimeout(() => this.state.errorType === "network" && this.setError(null));
      }

      this.setState(newState as IState);

      this.LARA = initializeLara();
      if (activity) {
        loadLearnerPluginState(activity, teacherEditionMode).then(() => {
          if (activity) {
            loadPluginScripts(this.LARA, activity, this.handleLoadPlugins, teacherEditionMode);
          }
        });
      }

      Modal.setAppElement("#app");

      Logger.initializeLogger(this.LARA, newState.username || this.state.username, role, classHash, teacherEditionMode, sequencePath, 0, sequencePath ? undefined : activityPath, currentPage, runRemoteEndpoint);

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
            { this.state.launchListAuthoringId && <LaunchListAuthoringNav
                launchList={this.state.launchList}
                launchListAuthoringId={this.state.launchListAuthoringId}
                launchListAuthoringActivities={this.state.launchListAuthoringActivities}
                launchListAuthoringCacheList={this.state.launchListAuthoringCacheList}
              />
            }
            { this.renderContent() }
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

  private renderContent = () => {
    const {launchList, loadingLaunchList, activity, showSequenceIntro, sequence, username, offlineMode, showLaunchListInstallConfimation, launchListAuthoringId} = this.state;
    if (launchList) {
      if (loadingLaunchList) {
        return <LaunchListLoadingDialog launchList={launchList} onClose={this.handleCloseLoadingLaunchList} showLaunchListInstallConfimation={showLaunchListInstallConfimation} />;
      } else if (activity) {
        return this.renderActivity();
      } else {
        const handleSelectActivity = (selectedActivity: Activity, url: string) => {
          this.setState({ activity: selectedActivity });
          if (this.state.launchListAuthoringId) {
            this.addActivityToLaunchList(this.state.launchListAuthoringId, selectedActivity, url);
          }
        };
        return <LaunchListLauncherDialog launchList={launchList} onSelectActivity={handleSelectActivity} />;
      }
    } else if (offlineMode && !launchListAuthoringId) {
      if (loadingLaunchList) {
        return <div>Loading launch list...</div>;
      }
      return <div>TODO: handle case were PWA does not have a launch list saved</div>;
    } else if (showSequenceIntro) {
      return <SequenceIntroduction sequence={sequence} username={username} onSelectActivity={this.handleSelectActivity} />;
    } else {
      return this.renderActivity();
    }
  }

  private renderActivity = () => {
    const { activity, idle, errorType, currentPage, username, pluginsLoaded, teacherEditionMode, sequence, portalData, offlineMode } = this.state;
    if (!activity) return (<div>Loading activity ...</div>);
    const totalPreviousQuestions = numQuestionsOnPreviousPages(currentPage, activity);
    const fullWidth = (currentPage !== 0) && (activity.pages[currentPage - 1].layout === PageLayouts.Responsive);
    const glossaryEmbeddable: IEmbeddablePlugin | undefined = getGlossaryEmbeddable(activity);
    const isCompletionPage = currentPage > 0 && activity.pages[currentPage - 1].is_completion;
    const handleShowLaunchList = () => this.setState({ activity: undefined });

    return (
      <React.Fragment>
        {offlineMode && <OfflineNav fullWidth={fullWidth} onShowLaunchList={handleShowLaunchList} /> }
        <Header
          fullWidth={fullWidth}
          projectId={activity.project_id}
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
        { this.state.sequence && this.renderSequenceNav(fullWidth) }
        { (activity.layout !== ActivityLayouts.SinglePage || this.state.sequence) &&
          this.renderNav(activity, currentPage, fullWidth)
        }
        { activity.layout === ActivityLayouts.SinglePage
          ? this.renderSinglePageContent(activity)
          : currentPage === 0
            ? this.renderIntroductionContent(activity)
            : activity.pages[currentPage - 1].is_completion
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
    return (
      <SequenceNav
        activities={this.state.sequence?.activities.map((a: Activity) => a.name)}
        currentActivity={this.state.activity?.name}
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
        thumbnailURL={activity.thumbnail_url}
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
         activityIndex: activityNum
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

  private handleCloseLoadingLaunchList = () => {
    this.setState({loadingLaunchList: false});
  }

  private addActivityToLaunchList = (launchListAuthoringId: string, activity: Activity, url: string) => {
    const isExternalUrl = /https?:\/\//.test(url);  // test for internal demo files
    if (launchListAuthoringId && isExternalUrl) {
      this.setState(prevState => {
        let {launchListAuthoringActivities} = prevState;
        const {launchListAuthoringCacheList} = prevState;

        getAllUrlsInActivity(activity).forEach(urlInActivity => {
          if (launchListAuthoringCacheList.indexOf(urlInActivity) === -1) {
            launchListAuthoringCacheList.push(urlInActivity);
          }
        });

        if (!prevState.launchListAuthoringActivities.find(a => a.url === url)) {
          launchListAuthoringActivities = launchListAuthoringActivities.concat({ name: activity.name, url });
          setLaunchListAuthoringData(launchListAuthoringId, {
            activities: launchListAuthoringActivities,
            cacheList: launchListAuthoringCacheList
          });
        }

        return {launchListAuthoringActivities, launchListAuthoringCacheList};
      });
    }
  }
}
