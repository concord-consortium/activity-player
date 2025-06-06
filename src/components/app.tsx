import React from "react";
import Modal from "react-modal";
import classNames from "classnames";
import { DynamicTextContext, DynamicTextManager } from "@concord-consortium/dynamic-text";

import { PortalDataContext } from "./portal-data-context";
import { Header } from "./activity-header/header";
import { ActivityNav } from "./activity-header/activity-nav";
import { SequenceNav } from "./activity-header/sequence-nav";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import { Footer } from "./activity-introduction/footer";
import {
  ActivityLayouts, numQuestionsOnPreviousPages,
  enableReportButton, setDocumentTitle, getPagePositionFromQueryValue,
  getSequenceActivityFromQueryValue, getSequenceActivityId,
  setAppBackgroundImage, getPageIDFromPosition, ActivityLayoutOverrides
} from "../utilities/activity-utils";
import { getActivityDefinition, getSequenceDefinition } from "../lara-api";
import { ThemeButtons } from "./theme-buttons";
import { SinglePageContent } from "./single-page/single-page-content";
import { WarningBanner } from "./warning-banner";
import { DefunctBanner } from "./defunct-banner";
import { CompletionPageContent } from "./activity-completion/completion-page-content";
import { deleteQueryValue, queryValue, queryValueBoolean, setQueryValue } from "../utilities/url-query";
import { fetchPortalData, fetchPortalJWT, firebaseAppName, getBasePortalUrl } from "../portal-api";
import { IPortalData, IPortalDataUnion } from "../portal-types";
import {
  signInWithToken, initializeDB, setPortalData, initializeAnonymousDB,
  onFirestoreSaveTimeout, onFirestoreSaveAfterTimeout, getPortalData, createOrUpdateApRun, getApRun
} from "../firebase-db";
import { Activity, IEmbeddablePlugin, Page, QuestionMap, Sequence } from "../types";
import { initializeLara, LaraGlobalType } from "../lara-plugin/index";
import { LaraGlobalContext } from "./lara-global-context";
import { loadPluginScripts, getActivityLevelPlugins, loadLearnerPluginState } from "../utilities/plugin-utils";
import { TeacherEditionBanner } from "./teacher-edition-banner";
import { Error } from "./error/error";
import { IdleWarning } from "./error/idle-warning";
import { ExpandableContainer } from "./expandable-content/expandable-container";
import { SequenceIntroduction } from "./sequence-introduction/sequence-introduction";
import { ModalDialog } from "./modal-dialog";
import { IMediaLibrary, INavigationOptions } from "@concord-consortium/lara-interactive-api";
import { Logger, LogEventName, getLoggingTeacherUsername } from "../lib/logger";
import { EmbeddablePlugin } from "./activity-page/plugins/embeddable-plugin";
import { getAttachmentsManagerOptions } from "../utilities/get-attachments-manager-options";
import { IdleDetector } from "../utilities/idle-detector";
import { initializeAttachmentsManager } from "@concord-consortium/interactive-api-host";
import { LaraDataContext } from "./lara-data-context";
import { __closeAllPopUps } from "../lara-plugin/plugin-api/popup";
import { IPageChangeNotification, PageChangeNotificationErrorTimeout, PageChangeNotificationStartTimeout } from "./activity-page/page-change-notification";
import { getBearerToken } from "../utilities/auth-utils";
import { ReadAloudContext } from "./read-aloud-context";
import { AccessibilityContext, FontSize, FontType, getFamilyForFontType, getFontSize, getFontSizeInPx, getFontType } from "./accessibility-context";
import { MediaLibraryContext } from "./media-library-context";
import { parseMediaLibraryItems } from "../lib/parse-media-library-items";
import { QuestionInfoContext } from "./question-info-context";
import { LockedBanner } from "./locked-banner";
import { isOfferingLocked } from "../utilities/portal-data-utils";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this
const kDefaultIncompleteMessage = "You must submit an answer for all required questions before advancing to another page.";

// User will see the idle warning after kMaxIdleTime
const kMaxIdleTime = 20 * 60 * 1000; // 20 minutes
// User session will timeout after kMaxIdleTime + kTimeout
const kTimeout = 5 * 60 * 1000; // 5 minutes

const kLearnPortalUrl = "https://learn.concord.org";

const kAnonymousUserName = "Anonymous";

const kDefaultFixedWidthLayout = "1100px";

// this is exported to that the TextBox component can pass it directly to DynamicText
// as the context due to it not re-rendering because of multiple forward refs components wrapping it
export const dynamicTextManager = new DynamicTextManager({
  onEvent: (event) => {
    switch (event.type) {
      case "readAloud":
        Logger.log({ event: LogEventName.read_aloud, event_value: event.text, ...event.extraLoggingInfo });
        break;
      case "readAloudCanceled":
        Logger.log({ event: LogEventName.read_aloud_canceled, event_value: event.text });
        break;
      case "readAloudComplete":
        // not logged for now but may be in the future
        break;
    }
  }
});

// stop speaking when navigating away or (for iOS support) hiding the page
const cancelSpeech = () => dynamicTextManager.selectComponent(null, {text: "", readAloud: true});
window.addEventListener("beforeunload", () => cancelSpeech());
window.addEventListener("pagehide", () => cancelSpeech());

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
  showDefunctBanner: boolean;
  showWarning: boolean;
  username: string;
  portalData?: IPortalData;
  questionMap?: QuestionMap;
  sequence?: Sequence;
  showSequenceIntro?: boolean;
  activityIndex?: number;
  showModal: boolean;
  modalLabel: string
  incompleteQuestions: IncompleteQuestion[];
  pluginsLoaded: boolean;
  errorType: null | ErrorType;
  idle: boolean;
  pageChangeNotification?: IPageChangeNotification;
  sequenceActivity?: string | undefined;
  readAloud: boolean;
  readAloudDisabled: boolean;
  hideReadAloud: boolean;
  hideQuestionNumbers: boolean;
  fontSize: FontSize;
  fontSizeInPx: number;
  fontType: FontType;
  fontFamilyForType: string;
  mediaLibrary: IMediaLibrary;
  scrollToQuestionId?: string;
  showFeedbackPage: boolean;
}
interface IProps { }

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
      showDefunctBanner: false,
      showWarning: false,
      username: kAnonymousUserName,
      showModal: false,
      modalLabel: "",
      incompleteQuestions: [],
      pluginsLoaded: false,
      errorType: null,
      idle: false,
      readAloud: dynamicTextManager.isReadAloudEnabled,
      readAloudDisabled: !dynamicTextManager.isReadAloudAvailable,
      hideReadAloud: false,
      hideQuestionNumbers: false,
      fontSize: "normal",
      fontSizeInPx: getFontSizeInPx("normal"),
      fontType: "normal",
      fontFamilyForType: getFamilyForFontType("normal"),
      mediaLibrary: {enabled: false, items: []},
      scrollToQuestionId: undefined,
      showFeedbackPage: false
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

  // note - this is different than the getVisiblePages in activity-utils.ts as it also looks at the author-preview query param
  private getVisiblePages = (activity: Activity) => {
    const pagesVisible = queryValue("author-preview") ? activity.pages : activity.pages.filter((page) => !page.is_hidden);
    return pagesVisible;
  }

  async componentDidMount() {
    try {
      const teacherEditionMode = queryValue("mode")?.toLowerCase() === "teacher-edition";
      // Teacher Edition mode is equal to preview mode. RunKey won't be used and the data won't be persisted.
      const preview = queryValueBoolean("preview") || teacherEditionMode;
      const sequencePath = queryValue("sequence");
      const activityPath = queryValue("activity") || kDefaultActivity;
      this.setState({showFeedbackPage: queryValueBoolean("showFeedback") });

      let sequenceActivity = queryValue("sequenceActivity");
      let page = queryValue("page");
      let newState: Partial<IState> = {};
      let classHash = "";
      let role = "unknown";
      let runRemoteEndpoint = "";
      let logEventsUsername = null;

      const bearerToken = getBearerToken();

      if (bearerToken) {
        try {
          const { rawPortalJWT, portalJWT } = await fetchPortalJWT(bearerToken);
          if (portalJWT.user_type === "learner") {
            // Student running an assigned offering from Portal.
            // As of 08/2022, portalJWT doesn't provide user_type when JWT is obtained using token coming from OAuth.
            // It works for students because they use short-lived tokens instead. Portal saves learner info in the
            // student's AccessGrant right before generating AP URL with the token.
            const portalData = await fetchPortalData(rawPortalJWT, portalJWT);
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
          } else if (portalJWT.user_type === "teacher" || portalJWT.user_type === undefined) {
            // Logged-in user who is not launching an offering from Portal, most likely teacher.
            // As of 08/2022, portalJWT doesn't provide user_type when JWT is obtained using token coming from OAuth.
            // Also, the only way to execute this code path is to launch AP Teacher Edition from Dashboard.
            // That's why "Teacher" username is used. In the future, we might need to obtain real username from Portal.
            newState.username = "Teacher";
            logEventsUsername = getLoggingTeacherUsername(portalJWT.uid, getBasePortalUrl());
            // It might look surprising that logged-in user will use an anonymous DB / run.
            // But it makes sense for teacher previewing an activity or viewing Teacher Edition.
            // AP treats Teacher Edition view same as preview (storing answers in offline db).
            await initializeAnonymousDB(preview);
          }
        } catch (err) {
          this.setError("auth", err);
        }
      } else {
        try {
          // Anonymous user running AP using a direct link most likely.
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

        // __skipGetApRun is used in Cypress tests to skip the ap run load
        if (!queryValueBoolean("__skipGetApRun")) {
          const apRun = await getApRun(sequenceActivity);
          if (apRun) {
            // use the sequence activity from the apRun if not passed as a parameter
            if (!sequenceActivity && apRun.data.sequence_activity) {
              sequenceActivity = apRun.data.sequence_activity;
            }
            // if the page is not passed as a parameter, use the page from the apRun
            if (!page) {
              page = `page_${apRun.data.page_id}`;
            } else {
              // if the page is passed as a parameter, it may not be a valid page in the sequence activity
              // however the getPagePositionFromQueryValue() handles this case -- we can't check it here
              // since we haven't loaded the activity in sequence definition yet
            }
          }
        }
      }

      const sequence: Sequence | undefined = sequencePath ? await getSequenceDefinition(sequencePath) : undefined;
      const sequenceActivityNum = sequence != null && !this.state.showFeedbackPage
        ? getSequenceActivityFromQueryValue(sequence, sequenceActivity)
        : 0;
      const activityIndex = sequence && sequenceActivityNum ? sequenceActivityNum - 1 : undefined;
      const activity: Activity = sequence != null && activityIndex != null && activityIndex >= 0
        ? sequence.activities[activityIndex]
        : await getActivityDefinition(activityPath);

      // This is used for teacher feedback.
      const questionMap: QuestionMap = {};
      if (sequence) {
        sequence.activities.forEach(a => {
          if (!a.id) return;
          this.processPagesForQuestionMap(a.pages, questionMap, a.id);
        });
      } else {
        this.processPagesForQuestionMap(activity.pages, questionMap, activity.id);
      }

      this.checkLayout(activity, sequence);

      this.setState({ mediaLibrary: parseMediaLibraryItems({sequence, activity})});

      const showSequenceIntro = sequence != null && sequenceActivityNum < 1;

      // If query parameter `showFeedback` is true, take the user to the "feedback page". For sequences, the
      // feedback page is the home page. For activities, the feedback page is the completion page or the home
      // page if no completion page is set.
      const completionPageIndex = this.getVisiblePages(activity).findIndex((p: Page) => p.is_completion);
      const completionPageNum = completionPageIndex !== -1 ? completionPageIndex + 1 : 0;
      const feedbackPageNum = sequence ? 0 : completionPageNum;

      if (this.state.showFeedbackPage) {
        if (sequence) {
          this.handleShowSequenceIntro();
        }

        deleteQueryValue("showFeedback");
      }

      const currentPage = !this.state.showFeedbackPage
        ? getPagePositionFromQueryValue(activity, page)
        : feedbackPageNum;

      // update the font size if different from default (default defined in app.scss)
      const fontSize = getFontSize({activity, sequence});
      // force large fonts in notebook activities
      // if (activity.layout === ActivityLayouts.Notebook) {
      //   fontSize = "large";
      // }
      const fontSizeInPx = getFontSizeInPx(fontSize);
      if (fontSizeInPx !== getFontSizeInPx("normal")) {
        const htmlElement = document.getElementsByTagName("html").item(0);
        const bodyElement = document.getElementsByTagName("body").item(0);
        if (htmlElement) {
          htmlElement.style.fontSize = `${fontSizeInPx}px`;
        }
        if (bodyElement) {
          bodyElement.classList.add(`font-size-${fontSize.toLowerCase().replace(/\s/, "-")}`);
        }
      }

      const fontType = getFontType({activity, sequence});
      const fontFamilyForType = getFamilyForFontType(fontType);

      // set the activity and page query parameters
      if (sequenceActivity) {
        setQueryValue("sequenceActivity", sequenceActivity);
      } else {
        deleteQueryValue("sequenceActivity");
      }
      if (currentPage !== 0) {
        setQueryValue("page", `page_${currentPage}`);
      } else {
        deleteQueryValue("page");
      }

      const showThemeButtons = queryValueBoolean("themeButtons");
      // Show a warning about obsolute features if activity/sequences is marked as defunct
      const showDefunctBanner = !!(activity.defunct || sequence?.defunct);
      // Show the warning if we are not running on production
      const showWarning = firebaseAppName() !== "report-service-pro";

      let hideReadAloud = false;
      let hideQuestionNumbers = false;
      if (sequence) {
        // sequence always overrides activity level setting
        hideReadAloud = !!sequence.hide_read_aloud;
        hideQuestionNumbers = !!sequence.hide_question_numbers;
      } else {
        hideReadAloud = !!activity.hide_read_aloud;
        hideQuestionNumbers = !!activity.hide_question_numbers;
      }

      if (hideReadAloud) {
        // turn off read-aloud but do not persist the setting
        dynamicTextManager.enableReadAloud({ enabled: false, saveSetting: false });
      }

      newState = {...newState, activity, activityIndex, currentPage, showThemeButtons, showDefunctBanner,
                     showWarning, showSequenceIntro, sequence, teacherEditionMode, sequenceActivity, hideReadAloud,
                     fontSize, fontSizeInPx, fontType, fontFamilyForType, hideQuestionNumbers,
                     questionMap};
      setDocumentTitle({activity, pageNumber: currentPage, sequence, sequenceActivityNum});

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
          let username = logEventsUsername || newState.username || this.state.username;
          const domain = queryValue("domain");
          const domainUID = queryValue("domain_uid");
          // If user is anonymous, but there are domain and domain_uid URL params available, use them to construct an username.
          // PJ 9/2/2021: This might be replaced by a proper OAuth path in the future. For now, it lets us log teacher edition events correctly.
          // PJ 8/19/2022: OAuth path is ready, but Portal needs to be updated to launch AP TE that way first. Only then we can remove this code.
          if (username === kAnonymousUserName && domain && domainUID) {
            username = getLoggingTeacherUsername(domainUID, domain);
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
          <LaraDataContext.Provider value={{activity: this.state.activity, sequence: this.state.sequence}}>
            <AccessibilityContext.Provider value={{fontSize: this.state.fontSize, fontSizeInPx: this.state.fontSizeInPx, fontType: this.state.fontType, fontFamilyForType: this.state.fontFamilyForType}}>
              <MediaLibraryContext.Provider value={this.state.mediaLibrary}>
                <QuestionInfoContext.Provider value={{questionMap: this.state.questionMap, scrollToQuestionId: this.state.scrollToQuestionId}}>
                  <DynamicTextContext.Provider value={dynamicTextManager}>
                    <ReadAloudContext.Provider value={{readAloud: this.state.readAloud, readAloudDisabled: this.state.readAloudDisabled, setReadAloud: this.handleSetReadAloud, hideReadAloud: this.state.hideReadAloud}}>
                      <div className="app" data-cy="app">
                        { this.state.showDefunctBanner && <DefunctBanner/> }
                        { this.state.showWarning && <WarningBanner/> }
                        { isOfferingLocked(this.state.portalData) && <LockedBanner isSequence={!!this.state.sequence}/> }
                        { this.state.teacherEditionMode && <TeacherEditionBanner/>}
                        { this.state.showSequenceIntro
                          ? <SequenceIntroduction
                              sequence={this.state.sequence}
                              username={this.state.username}
                              onSelectActivity={this.handleSelectActivity}
                            />
                          : this.renderActivity() }
                        { this.state.showThemeButtons && <ThemeButtons/>}
                        <div className="version-info" data-cy="version-info">{(window as any).__appVersionInfo || "(No Version Info)"}</div>
                        <ModalDialog
                          label={this.state.modalLabel}
                          onClose={() => {this.setShowModal(false);}}
                          showModal={this.state.showModal}
                        />
                      </div>
                    </ReadAloudContext.Provider>
                  </DynamicTextContext.Provider>
                </QuestionInfoContext.Provider>
              </MediaLibraryContext.Provider>
            </AccessibilityContext.Provider>
          </LaraDataContext.Provider>
        </PortalDataContext.Provider>
      </LaraGlobalContext.Provider>
    );
  }

  private renderActivity = () => {
    const { activity, idle, errorType, currentPage, username, pluginsLoaded, teacherEditionMode, sequence, portalData, activityIndex } = this.state;
    if (!activity) return (<div>Loading</div>);
    const totalPreviousQuestions = numQuestionsOnPreviousPages(currentPage, activity);
    const hasResponsiveSection = activity.pages[currentPage - 1]?.sections.filter(
      s => s.layout.includes("responsive"));
    const fullWidth = (currentPage !== 0) && (hasResponsiveSection.length > 0);
    const project = activity.project ? activity.project : null;
    const activityLevelPlugins: IEmbeddablePlugin[] = getActivityLevelPlugins(activity);
    const isCompletionPage = currentPage > 0 && activity.pages[currentPage - 1].is_completion;
    const backgroundImage = sequence?.background_image || activity.background_image;
    if (backgroundImage) {
      setAppBackgroundImage(backgroundImage);
    }

    // convert option with Ruby snake case to kebab case for css
    const fixedWidthLayout = (sequence?.fixed_width_layout || activity.fixed_width_layout || kDefaultFixedWidthLayout).replace(/_/g, "-");
    const activityClasses = classNames("activity", fullWidth ? "responsive" : `fixed-width-${fixedWidthLayout}`);
    const pagesVisible = this.getVisiblePages(activity);

    // create a key so when activities switch within a sequence React knows to update the DOM
    const key = `activity-${activityIndex || 0}`;

    return (
      <div key={key} className={activityClasses} data-cy="activity">
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
        {errorType && <Error type={errorType} onExit={this.goToPortal} />}
        {
          !idle && !errorType &&
          this.renderActivityContent(activity, currentPage, totalPreviousQuestions, fullWidth)
        }
        {(activity.layout === ActivityLayouts.SinglePage || currentPage === 0) &&
          <Footer
            fullWidth={fullWidth}
            project={project}
          />
        }
        {(activity.layout === ActivityLayouts.SinglePage || !isCompletionPage) &&
          <ExpandableContainer
            activity={activity}
            pageNumber={currentPage}
            page={pagesVisible[currentPage - 1]}
            teacherEditionMode={teacherEditionMode}
            pluginsLoaded={pluginsLoaded}
            plugins={activityLevelPlugins.length > 0}
          />
        }
        {!idle && (activity.layout === ActivityLayouts.SinglePage || !isCompletionPage) &&
          activityLevelPlugins.map((activityLevelPlugin, idx) => {
            return <EmbeddablePlugin
              key={idx}
              embeddable={activityLevelPlugin}
              pageNumber={currentPage}
              pluginsLoaded={pluginsLoaded}
              isActivityLevelPlugin={true}
            />;
          })
        }
      </div>
    );
  }

  private renderActivityContent = (activity: Activity, currentPage: number, totalPreviousQuestions: number, fullWidth: boolean) => {
    const pagesVisible = this.getVisiblePages(activity);
    const isSinglePageActivity = activity.layout === ActivityLayouts.SinglePage;
    const isMultiPageActivity = activity.layout === ActivityLayouts.MultiplePages;
    const isNotebookSequenceOverride = this.state.sequence?.layout_override === ActivityLayoutOverrides.Notebook;
    const renderTopNav = !isSinglePageActivity || isNotebookSequenceOverride;
    const renderBottomNav = isMultiPageActivity && !isNotebookSequenceOverride;

    return (
      <>
        {this.state.sequence && this.renderSequenceNav(fullWidth)}
        {renderTopNav &&
          this.renderNav(activity, currentPage, fullWidth)
        }
        {activity.layout === ActivityLayouts.SinglePage
          ? this.renderSinglePageContent(activity)
          : currentPage === 0
            ? this.renderIntroductionContent(activity)
            : pagesVisible[currentPage - 1].is_completion
              ? this.renderCompletionContent(activity)
              : <ActivityPageContent
                ref={this.activityPageContentRef}
                activityLayout={activity.layout}
                enableReportButton={currentPage === pagesVisible.length && enableReportButton(activity)}
                pageNumber={currentPage}
                page={pagesVisible[currentPage - 1]}
                activity={activity}
                totalPreviousQuestions={totalPreviousQuestions}
                teacherEditionMode={this.state.teacherEditionMode}
                setNavigation={this.handleSetNavigation}
                key={`page-${currentPage}`}
                pluginsLoaded={this.state.pluginsLoaded}
                pageChangeNotification={this.state.pageChangeNotification}
                hideReadAloud={this.state.hideReadAloud}
                hideQuestionNumbers={this.state.hideQuestionNumbers}
              />
        }
        {renderBottomNav &&
          this.renderNav(activity, currentPage, fullWidth)
        }
      </>
    );
  }

  private renderNav = (activity: Activity, currentPage: number, fullWidth: boolean) => {
    const isNotebook = activity.layout === ActivityLayouts.Notebook;

    return (
      <ActivityNav
        activityId={activity.id}
        activityPages={activity.pages}
        currentPage={currentPage}
        fullWidth={fullWidth}
        onPageChange={this.handleChangePage}
        singlePage={activity.layout === ActivityLayouts.SinglePage}
        lockForwardNav={this.state.incompleteQuestions.length > 0}
        usePageNames={isNotebook}
        hideNextPrevButtons={isNotebook}
        isSequence={!!this.state.sequence}
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
        hideQuestionNumbers={this.state.hideQuestionNumbers}
      />
    );
  }

  private renderIntroductionContent = (activity: Activity, isSequence?: boolean) => {
    return (
      <IntroductionPageContent
        activity={activity}
        isSequence={!!this.state.sequence}
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
      __closeAllPopUps();
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

  private handleChangePage = (page: number, embeddableId?: string) => {
    const { currentPage, incompleteQuestions, activity, sequenceActivity } = this.state;
    const pageId = activity ? getPageIDFromPosition(activity, page) : undefined;
    if (pageId) {
      setQueryValue("page", `page_${pageId}`);
      createOrUpdateApRun({ sequenceActivity, pageId });
    }
    if (page > currentPage && incompleteQuestions.length > 0) {
      const label = incompleteQuestions[0].navOptions?.message || kDefaultIncompleteMessage;
      this.setShowModal(true, label);
    } else if (page >= 0 && (activity && page <= activity.pages.length)) {

      // wait a bit to show the page change so we don't get a flicker when the page saves quickly
      const startPageChangeNotification = setTimeout(() => {
        this.setState({ pageChangeNotification: { state: "started" } });
      }, PageChangeNotificationStartTimeout);

      const navigateAway = () => {
        __closeAllPopUps(); // close any open pop ups
        clearTimeout(startPageChangeNotification);
        this.setState({
          currentPage: page,
          incompleteQuestions: [],
          pageChangeNotification: undefined,
          scrollToQuestionId: embeddableId
        });
        setDocumentTitle({ activity, pageNumber: page });
        if (!embeddableId) {
          // If there's no target embeddable specified, scroll to the top on page change
          document.getElementsByClassName("app")[0]?.scrollIntoView();
        }
        Logger.updateActivityPage(page);
        Logger.log({
          event: LogEventName.change_activity_page,
          parameters: { new_page: page }
        });
      };

      // Make sure that interactive state is saved before user can navigate away.
      const promises = this.activityPageContentRef.current?.requestInteractiveStates({ unloading: true }) || [Promise.resolve()];
      Promise.all(promises)
        .then(navigateAway)
        .catch(error => {
          // Notify user about error, but change page anyway after displaying error and waiting a bit.
          clearTimeout(startPageChangeNotification);
          this.setState({
            pageChangeNotification: {
              state: "errored",
              message: error.toString()
            }
          });
          setTimeout(() => {
            navigateAway();
          }, PageChangeNotificationErrorTimeout);
        });
    }
  }

  private handleSelectActivity = async (activityNum: number) => {

    Logger.updateSequenceActivityindex(activityNum + 1);
    Logger.log({
      event: LogEventName.change_sequence_activity,
      parameters: { new_activity_index: activityNum + 1, new_activity_name: this.state.sequence?.activities[activityNum].name }
    });

    let currentPage = 0;
    const { sequence } = this.state;
    const sequenceActivity = sequence !== undefined ? getSequenceActivityId(sequence, activityNum) : undefined;
    if (sequenceActivity && sequence) {
      const activity = sequence.activities[activityNum];
      const apRun = await getApRun(sequenceActivity);
      if (apRun) {
        currentPage = getPagePositionFromQueryValue(activity, `page_${apRun.data.page_id}`);
      }
      setQueryValue("sequenceActivity", sequenceActivity);
      if (currentPage !== 0) {
        setQueryValue("page", `page_${currentPage}`);
      } else {
        deleteQueryValue("page");
      }
    }

    this.setState((prevState) => {
      const activity = prevState.sequence?.activities[activityNum];
      this.checkLayout(activity, sequence);

      return {
        activity,
        showSequenceIntro: false,
        activityIndex: activityNum,
        currentPage,
        sequenceActivity
      };
    });
  }

  private handleShowSequenceIntro = () => {
    this.setState({ showSequenceIntro: true, activity: undefined });
    this.checkLayout(undefined, this.state.sequence);
    Logger.log({
      event: LogEventName.show_sequence_intro_page
    });
  }

  private setShowModal = (show: boolean, label = "") => {
    this.setState({ showModal: show, modalLabel: label });
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

  private handleSetReadAloud = (readAloud: boolean) => {
    this.setState({ readAloud });
    dynamicTextManager.enableReadAloud({ enabled: readAloud, saveSetting: true });
    Logger.log({ event: LogEventName.toggle_read_aloud, event_value: readAloud });
  };

  private checkLayout(activity?: Activity, sequence?: Sequence) {
    // the sequence layout override is 0 for none and +1 added to the activity layout options for the override
    if (activity && sequence && (sequence.layout_override > 0)) {
      activity.layout = sequence.layout_override - 1;
    }

    // add or remove the notebook body class if needed to override styles
    const body = document.getElementsByTagName("body").item(0);
    const addNotebookBodyClass =
      (activity?.layout === ActivityLayouts.Notebook) ||
      (sequence?.layout_override === ActivityLayoutOverrides.Notebook);
    if (addNotebookBodyClass) {
      body?.classList.add("notebook");
    } else {
      body?.classList.remove("notebook");
    }
  }

  private processPagesForQuestionMap = (pages: Page[], questionToActivityMap: QuestionMap, activityId?: number | null) => {
    pages.forEach(p => {
      if (p.is_hidden) {
        // hidden pages are not included in the question map
        return;
      }
      p.sections.forEach(s =>
        s.embeddables.forEach(e => {
          if (e.ref_id) {
            questionToActivityMap[e.ref_id] = { activityId, pageId: p.id };
          }
        })
      );
    });
  }
}
