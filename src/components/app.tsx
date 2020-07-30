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
import { signInWithToken, watchAnswers, initializeDB } from "../firebase-db";
import { Activity } from "../types";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this

interface IState {
  activity?: Activity;
  currentPage: number;
  showThemeButtons?: boolean;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  public constructor(props: IProps) {
    super(props);
    this.state = {
      currentPage: 0,
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
        watchAnswers(portalData, this.handleAnswersUpdated);
      }

      // page 0 is introduction, inner pages start from 1 and match page.position in exported activity
      const currentPage = Number(queryValue("page")) || 0;

      const showThemeButtons = queryValue("themeButtons")?.toLowerCase() === "true";

      this.setState({activity, currentPage, showThemeButtons});

    } catch (e) {
      console.warn(e);
    }
  }

  render() {
    return (
      <div className="app">
        <WarningBanner/>
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
          ? this.renderSinglePageContent()
          : currentPage === 0
            ? this.renderIntroductionContent()
            : activity.pages[currentPage - 1].is_completion
              ? this.renderCompletionContent()
              : <ActivityPageContent
                  enableReportButton={currentPage === activity.pages.length && enableReportButton(activity)}
                  isFirstActivityPage={currentPage === 1}
                  isLastActivityPage={currentPage === activity.pages.filter((page: any) => !page.is_hidden).length}
                  pageNumber={currentPage}
                  onPageChange={this.handleChangePage}
                  page={activity.pages.filter((page: any) => !page.is_hidden)[currentPage - 1]}
                  totalPreviousQuestions={totalPreviousQuestions}
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

  private renderSinglePageContent = () => {
    return (
      <React.Fragment>
        <SinglePageContent
          activity={this.state.activity}
        />
      </React.Fragment>
    );
  }

  private renderIntroductionContent = () => {
    return (
      <React.Fragment>
        <IntroductionPageContent
          activity={this.state.activity}
          onPageChange={this.handleChangePage}
        />
      </React.Fragment>
    );
  }

  private renderCompletionContent = () => {
    const { activity } = this.state;
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

  // updates `state.activity` to add `interactiveState` to embeddables
  private handleAnswersUpdated = (answers: firebase.firestore.DocumentData[]) => {
    // this is annoying and possibly a bug? Embeddables are coming through with `refId`'s such
    // as "404-ManagedInteractive", while answers are coming through with `question_id`'s such
    // as "managed_interactive_404"
    const questionIdToRefId = (questionId: string) => {
      const snakeCaseRegEx = /(\D*)_(\d*)/gm;
      const parsed = snakeCaseRegEx.exec(questionId);
      if (parsed && parsed.length) {
        const [ , embeddableType, embeddableId] = parsed;
        const camelCased = embeddableType.split("_").map(str => str.charAt(0).toUpperCase() + str.slice(1)).join("");
        return `${embeddableId}-${camelCased}`;
      }
      return questionId;
    };

    const getInteractiveState = (answer: firebase.firestore.DocumentData) => {
      const reportState = JSON.parse(answer.report_state);
      return JSON.parse(reportState.interactiveState);
    };

    // restructure answers to key off question_id
    const questionAnswers: {[id: string]: firebase.firestore.DocumentData} = {};
    answers.forEach(answer => questionAnswers[questionIdToRefId(answer.question_id)] = getInteractiveState(answer));

    const newActivityState = JSON.parse(JSON.stringify(this.state.activity));   // clone
    newActivityState.pages.forEach((page: any) => {
      page.embeddables.forEach((embeddable: any) => {
        const refId = embeddable.embeddable.ref_id;
        if (questionAnswers[refId]) {
          embeddable.embeddable.interactiveState = questionAnswers[refId];
        }
      });
    });

    this.setState({activity: newActivityState});
  }

}
