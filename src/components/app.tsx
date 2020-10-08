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
import { signInWithToken, watchAnswers, initializeDB, setPortalData, initializeAnonymousDB } from "../firebase-db";
import { Activity, Sequence } from "../types";
import { initializeLara, LaraGlobalType } from "../lara-plugin/index";
import { LaraGlobalContext } from "./lara-global-context";
import { loadPluginScripts } from "../utilities/plugin-utils";
import { TeacherEditionBanner }  from "./teacher-edition-banner";
import { AuthError }  from "./auth-error/auth-error";
import { ExpandableContainer } from "./expandable-content/expandable-container";
import { SequenceIntroduction } from "./sequence-introduction/sequence-introduction";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this

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
  lockedNavigationMessage: string;
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
      lockedNavigationMessage: "",
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

      const useAnonymousRunKey = !queryValue("token") && !queryValueBoolean("preview") && !teacherEditionMode;

      const newState: Partial<IState> = {activity, currentPage, showThemeButtons, showSequence, sequence, teacherEditionMode};
      setDocumentTitle(activity, currentPage);

      if (queryValue("token")) {
        try {
          const portalData = await fetchPortalData();
          if (portalData.fullName) {
            newState.username = portalData.fullName;
          }
          await initializeDB(portalData.database.appName);
          await signInWithToken(portalData.database.rawFirebaseJWT);
          this.setState({ portalData });

          setPortalData(portalData);
          watchAnswers();
        } catch (err) {
          this.setState({ authError: err });
          console.error("Authentication Error: " + err);
        }
      } else if (useAnonymousRunKey) {
        try {
          await initializeAnonymousDB();
          watchAnswers();
        } catch (err) {
          this.setState({ authError: err });
          console.error("Authentication Error: " + err);
        }
      }

      this.setState(newState as IState);

      if (teacherEditionMode) {
        this.LARA = initializeLara();
        loadPluginScripts(this.LARA, activity);
      }

    } catch (e) {
      console.warn(e);
    }
  }

  render() {
    return (
      <LaraGlobalContext.Provider value={this.LARA}>
        <PortalDataContext.Provider value={this.state.portalData}>
          <div className="app">
            <WarningBanner/>
            { this.state.teacherEditionMode && <TeacherEditionBanner/>}
            { this.state.showSequence 
              ? <SequenceIntroduction sequence={this.state.sequence} username={this.state.username} onSelectActivity={this.handleSelectActivity} />
              : this.renderActivity() }
            { this.state.showThemeButtons && <ThemeButtons/>}
          </div>
        </PortalDataContext.Provider>
      </LaraGlobalContext.Provider>
    );
  }

  private renderActivity = () => {
    const { activity, authError, currentPage, username } = this.state;
    if (!activity) return (<div>Loading</div>);
    const totalPreviousQuestions = numQuestionsOnPreviousPages(currentPage, activity);
    const fullWidth = (currentPage !== 0) && (activity.pages[currentPage - 1].layout === PageLayouts.Responsive);
    return (
      <React.Fragment>
        <Header
          fullWidth={fullWidth}
          projectId={activity.project_id}
          userName={username}
          activityName={activity.name}
          singlePage={activity.layout === ActivityLayouts.SinglePage}
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
        { (activity.layout !== ActivityLayouts.SinglePage && currentPage !== 0 && !activity.pages[currentPage - 1].is_completion) &&
          <ExpandableContainer
            activity={activity}
            pageNumber={currentPage}
            page={activity.pages.filter((page) => !page.is_hidden)[currentPage - 1]}
            teacherEditionMode={this.state.teacherEditionMode}
          />
        }
      </React.Fragment>
    );
  }

  private renderActivityContent = (activity: Activity, currentPage: number, totalPreviousQuestions: number, fullWidth: boolean) => {
    return (
      <>
        <ActivityNavHeader
          activityPages={activity.pages}
          currentPage={currentPage}
          fullWidth={fullWidth}
          onPageChange={this.handleChangePage}
          singlePage={activity.layout === ActivityLayouts.SinglePage}
          sequenceName={this.state.sequence?.display_title}
          onShowSequence={this.handleShowSequence}
        />
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
                  setLockedNavigationMessage={this.setLockedNavigationMessage}
                  key={`page-${currentPage}`}
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
          activityName={activity.name}
          isActivityComplete={true} // TODO: should be based on student progress
          onPageChange={this.handleChangePage}
          showStudentReport={activity.student_report_enabled}
          thumbnailURL={activity.thumbnail_url}
        />
    );
  }

  private handleChangePage = (page: number) => {
    if (page > this.state.currentPage && this.state.lockedNavigationMessage) {
      window.alert(this.state.lockedNavigationMessage);
    } else {
      this.setState({currentPage: page, lockedNavigationMessage: ""});
      setDocumentTitle(this.state.activity, page);  
    }
  }

  private setLockedNavigationMessage = (message: string) => {
    this.setState({lockedNavigationMessage: message});
  }

  private handleSelectActivity = (activityNum: number) => {
    this.setState((prevState) =>
      ({ activity: prevState.sequence?.activities[activityNum], showSequence: false })
    );
  }

  private handleShowSequence = () => {
    this.setState({showSequence: true});
  }
}
