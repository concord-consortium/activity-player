import React from "react";
import { PortalDataContext } from "./portal-data-context";
import { Header } from "./activity-header/header";
import { ActivityNavHeader } from "./activity-header/activity-nav-header";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import { Footer } from "./activity-introduction/footer";
import { ActivityLayouts, PageLayouts, numQuestionsOnPreviousPages, enableReportButton } from "../utilities/activity-utils";
import { getActivityDefinition } from "../lara-api";
import { ThemeButtons } from "./theme-buttons";
import { SinglePageContent } from "./single-page/single-page-content";
import { WarningBanner } from "./warning-banner";
import { CompletionPageContent } from "./activity-completion/completion-page-content";
import { queryValue, queryValueBoolean } from "../utilities/url-query";
import { fetchPortalData, IPortalData } from "../portal-api";
import { signInWithToken, watchAnswers, initializeDB, setPortalData, initializeAnonymousDB } from "../firebase-db";
import { Activity } from "../types";
import { createPluginNamespace } from "../lara-plugin/index";
import { loadPluginScripts } from "../utilities/plugin-utils";
import { TeacherEditionBanner }  from "./teacher-edition-banner";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this

interface IState {
  activity?: Activity;
  currentPage: number;
  teacherEditionMode?: boolean;
  showThemeButtons?: boolean;
  username: string;
  portalData?: IPortalData;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  public constructor(props: IProps) {
    super(props);
    this.state = {
      currentPage: 0,
      teacherEditionMode: false,
      showThemeButtons: false,
      username: "Anonymous",
    };
  }

  async componentDidMount() {
    try {
      const activityPath = queryValue("activity") || kDefaultActivity;
      const activity: Activity = await getActivityDefinition(activityPath);

      // page 0 is introduction, inner pages start from 1 and match page.position in exported activity
      const currentPage = Number(queryValue("page")) || 0;

      const showThemeButtons = queryValueBoolean("themeButtons");
      const teacherEditionMode = queryValue("mode")?.toLowerCase( )=== "teacher-edition";

      const useAnonymousRunKey = !queryValue("token") && !queryValueBoolean("preview") && !teacherEditionMode;

      const newState: Partial<IState> = {activity, currentPage, showThemeButtons, teacherEditionMode};

      if (queryValue("token")) {
        const portalData = await fetchPortalData();
        if (portalData.fullName) {
          newState.username = portalData.fullName;
        }
        await initializeDB(portalData.database.appName);
        await signInWithToken(portalData.database.rawFirebaseJWT);
        this.setState({ portalData });
        setPortalData(portalData);
        watchAnswers();
      } else if (useAnonymousRunKey) {
        await initializeAnonymousDB();
        watchAnswers();
      }

      this.setState(newState as IState);

      if (teacherEditionMode) {
        createPluginNamespace();
        loadPluginScripts(activity);
      }

    } catch (e) {
      console.warn(e);
    }
  }

  render() {
    return (
      <PortalDataContext.Provider value={this.state.portalData}>
        <div className="app">
          <WarningBanner/>
          { this.state.teacherEditionMode && <TeacherEditionBanner/>}
          { this.renderActivity() }
          { this.state.showThemeButtons && <ThemeButtons/>}
        </div>
      </PortalDataContext.Provider>
    );
  }

  private renderActivity = () => {
    const { activity, currentPage, username } = this.state;
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
        <ActivityNavHeader
          activityPages={activity.pages}
          currentPage={currentPage}
          fullWidth={fullWidth}
          onPageChange={this.handleChangePage}
          singlePage={activity.layout === ActivityLayouts.SinglePage}
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
                />
        }
        { (activity.layout === ActivityLayouts.SinglePage || currentPage === 0) &&
          <Footer
            fullWidth={fullWidth}
            projectId={activity.project_id}
          />
        }
      </React.Fragment>
    );
  }

  private renderSinglePageContent = (activity: Activity) => {
    return (
      <React.Fragment>
        <SinglePageContent
          activity={activity}
          teacherEditionMode={this.state.teacherEditionMode}
        />
      </React.Fragment>
    );
  }

  private renderIntroductionContent = (activity: Activity) => {
    return (
      <React.Fragment>
        <IntroductionPageContent
          activity={activity}
          onPageChange={this.handleChangePage}
        />
      </React.Fragment>
    );
  }

  private renderCompletionContent = (activity: Activity) => {
    return (
      <React.Fragment>
        <CompletionPageContent
          activityName={activity.name}
          isActivityComplete={true} // TODO: should be based on student progress
          onPageChange={this.handleChangePage}
          showStudentReport={activity.student_report_enabled}
          thumbnailURL={activity.thumbnail_url}
        />
      </React.Fragment>
    );
  }

  private handleChangePage = (page: number) => {
    this.setState({currentPage: page});
  }
}
