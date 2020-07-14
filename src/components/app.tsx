import React from "react";
import queryString from "query-string";
import { Header } from "./activity-header/header";
import { ActivityNavHeader } from "./activity-header/activity-nav-header";
import { ProfileNavHeader } from "./activity-header/profile-nav-header";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import Footer from "./activity-introduction/footer";
import { PageLayouts } from "../utilities/activity-utils";
import { ActivityDefinition, getActivityDefinition } from "../api";

import "./app.scss";

const kDefaultActivity = "sample-activity-multiple-layout-types";   // may eventually want to get rid of this

interface IState {
  activity?: ActivityDefinition;
  currentPage: number;
}
interface IProps {}

export class App extends React.PureComponent<IProps, IState> {

  public constructor(props: IProps) {
    super(props);
    this.state = {
      currentPage: 0
    };
  }

  async componentDidMount() {
    try {
      // ?activity=url&baseUrl=https%3A%2F%2Fauthoring.concord.org or ?activity=sample-activity
      const query = queryString.parse(window.location.search);
      const activityPath = query.activity || kDefaultActivity;
      const baseUrl = query.baseUrl;
      if (Array.isArray(activityPath)) {
        throw "May only have one activity query parameter";
      }
      if (Array.isArray(baseUrl)) {
        throw "May only have one baseUrl query parameter";
      }
      const activity = await getActivityDefinition(activityPath, baseUrl);
      this.setState({activity});
    } catch (e) {
      console.warn(e);
    }
  }

  render() {
    return (
      <div className="app">
        { this.renderActivity() }
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
