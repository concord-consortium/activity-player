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
import { Activity, IEmbeddablePlugin, OfflineManifest, OfflineManifestActivity, Sequence, ServiceWorkerStatus } from "../types";
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
import { Workbox } from "workbox-window/index";
import { getOfflineManifest, getOfflineManifestAuthoringData, getOfflineManifestAuthoringId, OfflineManifestAuthoringData, mergeOfflineManifestWithAuthoringData, saveOfflineManifestToOfflineActivities, setOfflineManifestAuthoringData, setOfflineManifestAuthoringId } from "../offline-manifest-api";
import { OfflineInstalling } from "./offline-installing";
import { OfflineActivities } from "./offline-activities";
import { OfflineNav } from "./offline-nav";
import { OfflineManifestAuthoringNav } from "./offline-manifest-authoring-nav";
import { DEFAULT_STUDENT_LOGGING_USERNAME, DEFAULT_STUDENT_NAME, StudentInfo } from "../student-info";
import { StudentInfoModal } from "./student-info-modal";
import { isNetworkConnected, monitorNetworkConnection } from "../utilities/network-connection";
import { isOfflineHost } from "../utilities/host-utils";

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
  currentPage: number;
  teacherEditionMode?: boolean;
  showThemeButtons?: boolean;
  showWarning: boolean;
  username: string;
  loggingUsername: string;
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
  serviceWorkerStatus: ServiceWorkerStatus;
  showEditUserName: boolean;
  networkConnected: boolean;
  serviceWorkerVersionInfo?: string;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  private LARA: LaraGlobalType;
  private activityPageContentRef = React.createRef<ActivityPageContent>();
  private studentInfo: StudentInfo;
  private unmonitorNetworkConnection?: () => void;

  public constructor(props: IProps) {
    super(props);

    const offlineMode = isOfflineHost();

    if (offlineMode) {
      // set the offline manifest authoring localstorage item if it exists in the params and then read from localstorage
      // this is done in the constructor as the state value is needed in the UNSAFE_componentWillMount method
      setOfflineManifestAuthoringId(queryValue("setOfflineManifestAuthoringId"));
    }
    const offlineManifestAuthoringId = offlineMode ? getOfflineManifestAuthoringId() : undefined;
    const offlineManifestId = offlineMode ? queryValue("offlineManifest") : undefined;

    this.state = {
      currentPage: 0,
      teacherEditionMode: false,
      showThemeButtons: false,
      showWarning: false,
      username: DEFAULT_STUDENT_NAME,
      loggingUsername: DEFAULT_STUDENT_LOGGING_USERNAME,
      showModal: false,
      modalLabel: "",
      incompleteQuestions: [],
      pluginsLoaded: false,
      errorType: null,
      idle: false,
      offlineMode,
      offlineManifestAuthoringActivities: [],
      offlineManifestAuthoringCacheList: [],
      offlineManifestAuthoringId,
      offlineManifestId,
      serviceWorkerStatus: "unknown",
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
      this.setState({serviceWorkerVersionInfo: "Starting..."});

      const wb = new Workbox("service-worker.js");

      // these are all events defined for workbox-window (https://developers.google.com/web/tools/workbox/modules/workbox-window)
      wb.addEventListener("installed", (event) => {
        console.log("A new service worker has installed.");
      });
      wb.addEventListener("waiting", (event) => {
        // TODO: in future work we should show a dialog using this recipe:
        // https://developers.google.com/web/tools/workbox/guides/advanced-recipes#offer_a_page_reload_for_users
        // For now just send a message to skip waiting so we don't have to do it manually in the devtools
        // This will trigger a 'controlling' event which we are listening for below and reload the page when
        // we get it
        //
        // Note: with the current setup this will cause 2 reloads for each change while developing
        // first webpack-dev-server will try to hot load the changes, it will find it can't do this
        // (I'm not sure why yet), it will reload the page because the hot load failed, this reload
        // will trigger a service worker update because each change to the activity-player
        // triggers a new service-worker since it includes a pre-cache manifest that includes
        // the javascript files. The service worker update will then trigger this
        // waiting event which we "skip". The new service worker will activate and start
        // controlling the page which triggers thre reload below.
        wb.messageSkipWaiting();
      });
      wb.addEventListener("controlling", (event) => {
        // A new service worker is now controlling the page.
        // Our service worker does not do a pre-cache step while installing
        // so there isn't a reason to reload the page once it is controlling.
        //
        // TODO: instead we should be notified when install.html has updated the
        // the cache and reload the page when that happens, or at least notify
        // the user.
        console.log("A new service worker has installed and is controlling.");
      });
      wb.addEventListener("activating", (event) => {
        console.log("A new service worker is activating.");
      });
      wb.addEventListener("activated", (event) => {
        if (!event.isUpdate) {
          console.log("Service worker activated for the first time!");
        } else {
          console.log("Service worker activated with an update");
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
                // TODO: we only allow cors requests, so it would be helpful to authors
                // if we checked whether the url can be requested with cors and if not
                // we notify the author about the invalid url

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
        console.log("Workbox register() promise resolved", _registration);
        if (navigator.serviceWorker.controller) {
          // We are controlled
          // This means there was an active service worker when the page was loaded
          // There might also be a another service worker waiting to the replace
          // the one currently controlling the page, but for our status monitoring
          // code we don't care about this waiting service worker.
          this.setState({serviceWorkerStatus: "controlling"});
        } else {
          // Otherwise, this could be the first
          // time the page is loaded or the user could have used shift-reload
          // in either case the service worker won't start controlling unless it
          // calls clients.claim() and our service worker doesn't do that.
          // The service worker will transition through the states of
          // installing, installed, waiting, activating, active
          // The workbox "waiting" event is different than the waiting state of
          // a service worker. During an initial load workbox won't fire the
          // waiting event even though the worker passes through the waiting state

          // The _registration has fields for 'installing', 'waiting', and 'active'
          // The workbox getSW() is supposed to abstract that so we don't need to check
          // of those fields to find the service worker
          wb.getSW().then((sw) => {
            this.setState({serviceWorkerStatus: sw.state});

            sw.addEventListener("statechange", () => {
              this.setState({serviceWorkerStatus: sw.state});
            });
          });

          // Workbox doesn't handle a shift-reload well. In that case
          // getSW() never resolves even though there could be an active
          // service worker. I filed a bug about this:
          // https://github.com/GoogleChrome/workbox/issues/2788
          // Likewise it doesn't handle a serviceWorker that started installing
          // in a different tab and hasn't finished yet.
          const regSW = _registration?.active ?? _registration?.installing;

          if (regSW) {
            this.setState({serviceWorkerStatus: regSW.state});
            // This might conflict with the listener added in getSW()
            // however currently getSW will only resolve if
            // navigator.serviceWorker.controller or registration.waiting are set
            // during the registration. At this point in the logic
            // navigator.serviceWorker.controller is not set, and
            // it is unlikely there would be a waiting worker at the same time
            // as an active or installing worker immediately after the register call.
            regSW.addEventListener("statechange", () => {
              this.setState({serviceWorkerStatus: regSW.state});
            });
          }
        }

        console.log("Sending GET_VERSION_INFO to service worker...");
        this.setState({serviceWorkerVersionInfo: "Checking..."});
        wb.messageSW({type: "GET_VERSION_INFO"})
          .then(versionInfo => {
            this.setState({serviceWorkerVersionInfo: versionInfo});
          })
          .catch(() => {
            this.setState({serviceWorkerVersionInfo: "No response!"});
          });
      });
    }
  }

  async componentDidMount() {
    try {
      const {offlineMode, offlineManifestId, offlineManifestAuthoringId } = this.state;

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
          await this.addActivityToOfflineManifest(offlineManifestAuthoringId, activity, resourceUrl, contentUrl);
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

      const newState: Partial<IState> = {activity, offlineManifest, currentPage, showThemeButtons, showWarning, showSequenceIntro, sequence, teacherEditionMode, offlineManifestAuthoringId};
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
      newState.loggingUsername = this.studentInfo.loggingUsername;
      this.setState(newState as IState);

      this.LARA = initializeLara();
      if (activity && resourceUrl) {
        loadLearnerPluginState(activity, resourceUrl, teacherEditionMode).then(() => {
          if (activity) {
            loadPluginScripts(this.LARA, activity, this.handleLoadPlugins, teacherEditionMode);
          }
        });
      }

      Modal.setAppElement("#app");

      Logger.initializeLogger(this.LARA, newState.loggingUsername || this.state.loggingUsername, role, classHash, teacherEditionMode, sequencePath, 0, sequencePath ? undefined : activityPath, currentPage, runRemoteEndpoint, offlineMode);

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
    const appVersionInfo = (window as any).__appVersionInfo;
    const {serviceWorkerVersionInfo} = this.state;
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
            <div className="version-info" data-cy="version-info">
              Application: {appVersionInfo || "No Version Info"}
              {serviceWorkerVersionInfo && ` | Service Worker: ${serviceWorkerVersionInfo}`}
            </div>
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
    const {showSequenceIntro, sequence,
      username, offlineMode, activity,
      serviceWorkerStatus} = this.state;
    if (offlineMode && serviceWorkerStatus !== "controlling") {
      return <OfflineInstalling serviceWorkerStatus={serviceWorkerStatus}/>;
    } else if (offlineMode) {
      return activity ? this.renderActivity() : <OfflineActivities username={username} />;
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
            offlineMode={offlineMode}
          />
        }
        { glossaryEmbeddable && (activity.layout === ActivityLayouts.SinglePage || !isCompletionPage) &&
          <GlossaryPlugin embeddable={glossaryEmbeddable} pageNumber={currentPage} offlineMode={offlineMode} pluginsLoaded={pluginsLoaded}  />
        }
      </React.Fragment>
    );
  }

  private renderActivityContent = (activity: Activity, currentPage: number, totalPreviousQuestions: number, fullWidth: boolean) => {
    const {offlineMode} = this.state;
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
                  offlineMode={offlineMode}
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
    const {offlineMode} = this.state;
    return (
      <SinglePageContent
        activity={activity}
        teacherEditionMode={this.state.teacherEditionMode}
        pluginsLoaded={this.state.pluginsLoaded}
        offlineMode={offlineMode}
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
    const showReportBackupOptions = this.state.offlineMode || queryValueBoolean("__forceOfflineData");
    return (
      <CompletionPageContent
        activity={activity}
        activityName={activity.name}
        onPageChange={this.handleChangePage}
        showStudentReport={activity.student_report_enabled}
        showReportBackupOptions={showReportBackupOptions}
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

  private addActivityToOfflineManifest = async (offlineManifestAuthoringId: string, activity: Activity,
    resourceUrl: string, contentUrl: string) => {
    if (offlineManifestAuthoringId && isNotSampleActivityUrl(contentUrl)) {
      const urls = await getAllUrlsInActivity(activity);

      this.setState(prevState => {
        let {offlineManifestAuthoringActivities} = prevState;
        const {offlineManifestAuthoringCacheList} = prevState;

        urls.forEach(urlInActivity => {
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

  private handleShowOfflineActivities = () => this.setState({ activity: undefined });

  private trackOfflineResourceUrl(resourceUrl: string) {
    TrackOfflineResourceUrl(resourceUrl);
    Logger.setActivity(resourceUrl);
  }

}
