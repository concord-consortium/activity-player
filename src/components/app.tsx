import React from "react";
import { PortalDataContext } from "./portal-data-context";
import { Header } from "./activity-header/header";
import { ActivityNav } from "./activity-header/activity-nav";
import { SequenceNav } from "./activity-header/sequence-nav";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import { Footer } from "./activity-introduction/footer";
import { ActivityLayouts, PageLayouts, numQuestionsOnPreviousPages, enableReportButton, setDocumentTitle, getPagePositionFromQueryValue, getAllUrlsInActivity, isNotSampleActivityUrl } from "../utilities/activity-utils";
import { getActivityDefinition, getResourceUrl, getSequenceDefinition } from "../lara-api";
import { ThemeButtons } from "./theme-buttons";
import { SinglePageContent } from "./single-page/single-page-content";
import { WarningBanner } from "./warning-banner";
import { CompletionPageContent } from "./activity-completion/completion-page-content";
import { queryValue, queryValueBoolean } from "../utilities/url-query";
import { IPortalData, firebaseAppName } from "../portal-api";
import { Activity, IEmbeddablePlugin, OfflineManifest, OfflineManifestActivity, Sequence } from "../types";
import { TrackOfflineResourceUrl, initStorage } from "../storage/storage-facade";
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
import { getOfflineManifest, getOfflineManifestAuthoringData, getOfflineManifestAuthoringId, OfflineManifestAuthoringData, mergeOfflineManifestWithAuthoringData, saveOfflineManifestToOfflineActivities, setOfflineManifestAuthoringData, setOfflineManifestAuthoringId } from "../offline-manifest-api";
import { OfflineManifestLoadingModal } from "./offline-manifest-loading-modal";
import { OfflineActivities } from "./offline-activities";
import { OfflineNav } from "./offline-nav";
import { OfflineManifestAuthoringNav } from "./offline-manifest-authoring-nav";
import { StudentInfo } from "../student-info";
import { StudentInfoModal } from "./student-info-modal";
import { isNetworkConnected, monitorNetworkConnection } from "../utilities/network-connection";
import { getHostnameWithMaybePort, isOfflineHost } from "../utilities/host-utils";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this
const kDefaultIncompleteMessage = "Please submit an answer first.";

// User will see the idle warning after kMaxIdleTime
const kMaxIdleTime = parseInt(queryValue("__maxIdleTime") || `${20 * 60 * 1000}`, 10); // 20 minutes
// User session will timeout after kMaxIdleTime + kTimeout
const kTimeout = parseInt(queryValue("__timeout") || `${5 * 60 * 1000}`, 10); // 5 minutes

const kLearnPortalUrl = "https://learn.concord.org";

export type ErrorType = "auth" | "network" | "timeout";

interface IncompleteQuestion {
  refId: string;
  navOptions: INavigationOptions;
}

interface IState {
  activity?: Activity;
  offlineManifest?: OfflineManifest;
  loadingOfflineManifest: boolean;
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
  offlineManifestId?: string;
  offlineManifestAuthoringId?: string;
  offlineManifestAuthoringActivities: OfflineManifestActivity[];
  offlineManifestAuthoringCacheList: string[];
  showOfflineManifestInstallConfirmation: boolean;
  showEditUserName: boolean;
  networkConnected: boolean;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  private LARA: LaraGlobalType;
  private activityPageContentRef = React.createRef<ActivityPageContent>();
  private studentInfo: StudentInfo;
  private unmonitorNetworkConnection?: () => void;

  public constructor(props: IProps) {
    super(props);

    const offlineMode = isOfflineHost(getHostnameWithMaybePort());

    if (offlineMode) {
      // set the offline manifest authoring localstorage item if it exists in the params and then read from localstorage
      // this is done in the constructor as the state value is needed in the UNSAFE_componentWillMount method
      setOfflineManifestAuthoringId(queryValue("setOfflineManifestAuthoringId"));
    }
    const offlineManifestAuthoringId = offlineMode ? getOfflineManifestAuthoringId() : undefined;
    const offlineManifestId = offlineMode ? queryValue("offlineManifest") : undefined;
    const loadingOfflineManifest = !!offlineManifestId;

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
      loadingOfflineManifest,
      offlineMode,
      offlineManifestAuthoringActivities: [],
      offlineManifestAuthoringCacheList: [],
      showOfflineManifestInstallConfirmation: queryValue("confirmOfflineManifestInstall") === "true",
      offlineManifestAuthoringId,
      offlineManifestId,
      showEditUserName: false,
      networkConnected: isNetworkConnected()
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
    // start monitoring the network connection
    this.unmonitorNetworkConnection = monitorNetworkConnection((networkConnected) => this.setState({networkConnected}));

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
        const {offlineManifestAuthoringId} = this.state;
        switch (event.data.type) {
          case "CACHE_UPDATED":
            console.log(`A newer version of ${event.data.payload.updatedURL} is available!`);
            break;

          case "GET_REQUEST":
            if (offlineManifestAuthoringId) {
              this.setState((prevState) => {
                // make sure all models-resources requests use the base folder
                const url = event.data.url.replace(/.*models-resources\//, "models-resources/");
                let {offlineManifestAuthoringCacheList} = prevState;
                const {offlineManifestAuthoringActivities} = prevState;
                if (!/api\/v1\/activities/.test(url) && (offlineManifestAuthoringCacheList.indexOf(url) === -1)) {
                  offlineManifestAuthoringCacheList = offlineManifestAuthoringCacheList.concat(url);
                }
                setOfflineManifestAuthoringData(offlineManifestAuthoringId, {
                  activities: offlineManifestAuthoringActivities,
                  cacheList: offlineManifestAuthoringCacheList
                });
                return {...prevState, offlineManifestAuthoringCacheList};
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
      const {offlineMode, offlineManifestId, offlineManifestAuthoringId, loadingOfflineManifest} = this.state;

      let offlineManifestAuthoringData: OfflineManifestAuthoringData | undefined;
      if (offlineManifestAuthoringId) {
        offlineManifestAuthoringData = getOfflineManifestAuthoringData(offlineManifestAuthoringId);
      }

      let offlineManifest: OfflineManifest | undefined = undefined;
      if (offlineManifestId) {
        offlineManifest = await getOfflineManifest(offlineManifestId);

        if (offlineManifest) {
          if (offlineManifestAuthoringId && offlineManifestAuthoringData) {
            offlineManifestAuthoringData = mergeOfflineManifestWithAuthoringData(offlineManifest, offlineManifestAuthoringData);
            setOfflineManifestAuthoringData(offlineManifestAuthoringId, offlineManifestAuthoringData);
          }

          await saveOfflineManifestToOfflineActivities(offlineManifest);
        }
      }

      if (offlineManifestAuthoringData) {
        this.setState({
          offlineManifestAuthoringActivities: offlineManifestAuthoringData.activities,
          offlineManifestAuthoringCacheList: offlineManifestAuthoringData.cacheList
        });
      }

      let activity: Activity | undefined = undefined;
      let resourceUrl: string | undefined = undefined;
      const activityPath = queryValue("activity") || (offlineMode ? undefined : kDefaultActivity);
      if (activityPath) {
        resourceUrl = getResourceUrl(activityPath);

        // initial call to set the id in the storage facade
        this.trackOfflineResourceUrl(resourceUrl);

        // allow overriding the location of the activity definition this way we
        // can lock down the activity definition, but still use the common
        // resourceUrl that would be used if the resource was online
        const contentUrl = queryValue("contentUrl") || activityPath;
        activity = await getActivityDefinition(contentUrl);
        if (offlineManifestAuthoringId) {
          this.addActivityToOfflineManifest(offlineManifestAuthoringId, activity, resourceUrl, contentUrl);
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

      const newState: Partial<IState> = {activity, offlineManifest, loadingOfflineManifest, currentPage, showThemeButtons, showWarning, showSequenceIntro, sequence, teacherEditionMode, offlineManifestAuthoringId};
      setDocumentTitle(activity, currentPage);

      // Initialize Storage provider
      const useOfflineStorage = this.state.offlineMode || queryValueBoolean("__forceOfflineData");
      const storage = await initStorage({name: firebaseAppName(), preview, offline: useOfflineStorage});
      this.studentInfo = new StudentInfo(storage);
      await this.studentInfo.init();
      const role = this.studentInfo.role;
      const classHash = this.studentInfo.getClassHash();
      const runRemoteEndpoint = this.studentInfo.getRunRemoteEndpoint();
      newState.username = this.studentInfo.name;
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

      Logger.initializeLogger(this.LARA, newState.username || this.state.username, role, classHash, teacherEditionMode, sequencePath, 0, sequencePath ? undefined : activityPath, currentPage, runRemoteEndpoint, offlineMode);

      // call this again now that the logger is available
      if (resourceUrl) {
        this.trackOfflineResourceUrl(resourceUrl);
      }

      const idleDetector = new IdleDetector({ idle: Number(kMaxIdleTime), onIdle: this.handleIdleness });
      idleDetector.start();
    } catch (e) {
      console.warn(e);
    }
  }

  componentWillUnmount() {
    if (this.unmonitorNetworkConnection) {
      this.unmonitorNetworkConnection();
    }
  }

  render() {
    const showOfflineNav = this.state.offlineMode && !!this.state.activity;
    return (
      <LaraGlobalContext.Provider value={this.LARA}>
        <PortalDataContext.Provider value={this.state.portalData}>
          <div className="app" data-cy="app">
            { this.state.showWarning && <WarningBanner/> }
            { this.state.teacherEditionMode && <TeacherEditionBanner/>}
            { this.state.offlineManifestAuthoringId && <OfflineManifestAuthoringNav
                offlineManifest={this.state.offlineManifest}
                offlineManifestAuthoringId={this.state.offlineManifestAuthoringId}
                offlineManifestAuthoringActivities={this.state.offlineManifestAuthoringActivities}
                offlineManifestAuthoringCacheList={this.state.offlineManifestAuthoringCacheList}
              />
            }
            { showOfflineNav && <OfflineNav onOfflineActivities={this.handleShowOfflineActivities} /> }
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
    const {offlineManifest, loadingOfflineManifest, showSequenceIntro, sequence, username, offlineMode, showOfflineManifestInstallConfirmation, activity} = this.state;
    if (offlineManifest && loadingOfflineManifest) {
      return <OfflineManifestLoadingModal offlineManifest={offlineManifest} onClose={this.handleCloseLoadingOfflineManifest} showOfflineManifestInstallConfirmation={showOfflineManifestInstallConfirmation} />;
    } else if (offlineMode) {
      return activity ? this.renderActivity() : <OfflineActivities onSelectActivity={this.handleSelectOfflineActivity} username={username} />;
    } else if (showSequenceIntro) {
      return <SequenceIntroduction sequence={sequence} username={username} onSelectActivity={this.handleSelectActivity} />;
    } else {
      return this.renderActivity();
    }
  }

  private renderActivity = () => {
    const { activity, idle, errorType, currentPage, username, pluginsLoaded, teacherEditionMode, sequence, portalData, showEditUserName, offlineMode } = this.state;
    if (!activity) return (<div>Loading activity ...</div>);
    const totalPreviousQuestions = numQuestionsOnPreviousPages(currentPage, activity);
    const fullWidth = (currentPage !== 0) && (activity.pages[currentPage - 1].layout === PageLayouts.Responsive);
    const glossaryEmbeddable: IEmbeddablePlugin | undefined = getGlossaryEmbeddable(activity);
    const isCompletionPage = currentPage > 0 && activity.pages[currentPage - 1].is_completion;

    const closeStudentModal = (newUsername?: string) => {
      if (newUsername) {
        this.setState({
          username: newUsername,
          showEditUserName: false
        });
      } else {
        this.setState({
          showEditUserName: false
        });
      }
    };

    const openStudentInfoModal = () => {
      if(this.studentInfo.canChangeName()) {
        this.setState({showEditUserName: true});
      }
    };

    return (
      <React.Fragment>
        <StudentInfoModal
          showModal={showEditUserName}
          onClose={closeStudentModal}
          studentInfo={this.studentInfo}
        />
        <Header
          fullWidth={fullWidth}
          projectId={activity.project_id}
          userName={username}
          contentName={sequence ? sequence.display_title || sequence.title || "" : activity.name}
          showSequence={sequence !== undefined}
          onShowSequence={sequence !== undefined ? this.handleShowSequenceIntro : undefined}
          onClickUsername={openStudentInfoModal}
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
        { errorType && <Error type={errorType} onExit={this.goToPortal} offlineMode={offlineMode} /> }
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

  private handleCloseLoadingOfflineManifest = () => {
    this.setState({loadingOfflineManifest: false});
  }

  private addActivityToOfflineManifest = (offlineManifestAuthoringId: string, activity: Activity,
    resourceUrl: string, contentUrl: string) => {
    if (offlineManifestAuthoringId && isNotSampleActivityUrl(contentUrl)) {
      this.setState(prevState => {
        let {offlineManifestAuthoringActivities} = prevState;
        const {offlineManifestAuthoringCacheList} = prevState;

        getAllUrlsInActivity(activity).forEach(urlInActivity => {
          if (offlineManifestAuthoringCacheList.indexOf(urlInActivity) === -1) {
            offlineManifestAuthoringCacheList.push(urlInActivity);
          }
        });

        if (!prevState.offlineManifestAuthoringActivities.find(a => a.resourceUrl === resourceUrl)) {
          offlineManifestAuthoringActivities =
            offlineManifestAuthoringActivities.concat({ name: activity.name, resourceUrl, contentUrl });
          setOfflineManifestAuthoringData(offlineManifestAuthoringId, {
            activities: offlineManifestAuthoringActivities,
            cacheList: offlineManifestAuthoringCacheList
          });
        }

        return {offlineManifestAuthoringActivities, offlineManifestAuthoringCacheList};
      });
    }
  }

  private handleSelectOfflineActivity = (selectedActivity: Activity, resourceUrl: string, contentUrl: string) => {
    this.setState({ activity: selectedActivity });
    this.trackOfflineResourceUrl(resourceUrl);
    if (this.state.offlineManifestAuthoringId) {
      this.addActivityToOfflineManifest(this.state.offlineManifestAuthoringId, selectedActivity,
        resourceUrl, contentUrl);
    }
  }

  private handleShowOfflineActivities = () => this.setState({ activity: undefined });

  private trackOfflineResourceUrl(resourceUrl: string) {
    TrackOfflineResourceUrl(resourceUrl);
    Logger.setActivity(resourceUrl);
  }

}
