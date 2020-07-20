import React from "react";
import { Header } from "./activity-header/header";
import { ActivityNavHeader } from "./activity-header/activity-nav-header";
import { ProfileNavHeader } from "./activity-header/profile-nav-header";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import Footer from "./activity-introduction/footer";
import { PageLayouts } from "../utilities/activity-utils";
import { ActivityDefinition, getActivityDefinition } from "../api";
import { ThemeButtons } from "./theme-buttons";

import "./app.scss";
import { queryValue } from "../utilities/url-query";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this

interface IState {
  activity?: ActivityDefinition;
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
      const baseUrl = queryValue("baseUrl");
      const activity = await getActivityDefinition(activityPath, baseUrl);

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
        { this.renderActivity() }
        { this.state.showThemeButtons && <ThemeButtons/>}
      </div>
    );
  }

  private renderActivity = () => {
    const { activity, currentPage } = this.state;
    if (!activity) return (<div>Loading</div>);

    let totalPreviousQuestions = 0;

    for (let page = 0; page < currentPage - 1; page++) {
      for (let embeddable = 0; embeddable < activity.pages[page].embeddables.length; embeddable++) {
        if (!activity.pages[page].embeddables[embeddable].section) {
          totalPreviousQuestions++;
        }
      }
    }

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
        />
        <ProfileNavHeader
          fullWidth={fullWidth}
          name={"test student"}
        />
        { currentPage === 0
          ? this.renderIntroductionContent()
          : <ActivityPageContent
              isFirstActivityPage={currentPage === 1}
              isLastActivityPage={currentPage === activity.pages.length}
              pageNumber={currentPage}
              onPageChange={this.handleChangePage}
              page={activity.pages[currentPage - 1]}
              totalPreviousQuestions={totalPreviousQuestions}
            />
        }
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
        <Footer/ >
      </React.Fragment>
    );
  }

  private handleChangePage = (page: number) => {
    this.setState({currentPage: page});
  }

}
