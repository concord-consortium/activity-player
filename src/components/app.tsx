import React from "react";
import { Header } from "./activity-header/header";
import { ActivityNavHeader } from "./activity-header/activity-nav-header";
import { ProfileNavHeader } from "./activity-header/profile-nav-header";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import { Footer } from "./activity-introduction/footer";
import { ActivityLayouts, PageLayouts, numQuestionsOnPreviousPages, enableReportButton } from "../utilities/activity-utils";
import { getActivityDefinition } from "../lara-api";
import { ThemeButtons } from "./theme-buttons";
import { SinglePageContent } from "./single-page/single-page-content";
import { WarningBanner } from "./warning-banner";
import { CompletionPageContent } from "./activity-completion/completion-page-content";
import { queryValue } from "../utilities/url-query";
import { fetchPortalData } from "../portal-api";
import { signInWithToken, watchAnswers, initializeDB, setPortalData } from "../firebase-db";
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
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  public constructor(props: IProps) {
    super(props);
    this.state = {
      currentPage: 0,
      teacherEditionMode: false,
      showThemeButtons: false
    };
  }

  async componentDidMount() {
    try {
      const activityPath = queryValue("activity") || kDefaultActivity;
      const activity: Activity = await getActivityDefinition(activityPath);

      if (queryValue("token")) {
        const portalData = await fetchPortalData();
        await initializeDB(portalData.database.appName);
        await signInWithToken(portalData.database.rawFirebaseJWT);
        setPortalData(portalData);
        watchAnswers();
      }

      // page 0 is introduction, inner pages start from 1 and match page.position in exported activity
      const currentPage = Number(queryValue("page")) || 0;

      const showThemeButtons = queryValue("themeButtons")?.toLowerCase() === "true";
      const teacherEditionMode = queryValue("mode")?.toLowerCase( )=== "teacher-edition";

      this.setState({activity, currentPage, showThemeButtons, teacherEditionMode});

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
      <div className="app">
        <WarningBanner/>
        { this.state.teacherEditionMode && <TeacherEditionBanner/>}
        { this.renderActivity() }
        { this.state.showThemeButtons && <ThemeButtons/>}
      </div>
    );
  }

  private renderActivity = () => {
    const { activity, currentPage } = this.state;
    if (!activity) return (<div>Loading</div>);

    const totalPreviousQuestions = numQuestionsOnPreviousPages(currentPage, activity);
    const fullWidth = (currentPage !== 0) && (activity.pages[currentPage - 1].layout === PageLayouts.Responsive);
    return (
      <React.Fragment>
        <Header
          fullWidth={fullWidth}
          projectId={activity.project_id}
        />
        <ActivityNavHeader
          activityName={activity.name}
          activityPages={activity.pages}
          currentPage={currentPage}
          fullWidth={fullWidth}
          onPageChange={this.handleChangePage}
          singlePage={activity.layout === ActivityLayouts.SinglePage}
        />
        <ProfileNavHeader
          fullWidth={fullWidth}
          name={"test student"}
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
