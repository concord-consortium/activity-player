import React from "react";
import { Header } from "./activity-header/header";
import { ActivityNavHeader } from "./activity-header/activity-nav-header";
import { ProfileNavHeader } from "./activity-header/profile-nav-header";
import { SocialMediaLinks } from "./activity-introduction/social-media-links";
import { ActivitySummary } from "./activity-introduction/activity-summary";
import { ActivityPageLinks } from "./activity-introduction/activity-page-links";
import Footer from "./activity-introduction/footer";
import sampleActivity from "../data/sample-activity-1.json";

import "./app.scss";

interface IState {
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

  render() {
    return (
      <div className="app">
        { this.renderActivity() }
      </div>
    );
  }

  private renderActivity = () => {
    return (
      <React.Fragment>
        <Header />
        <ActivityNavHeader
          activityName={sampleActivity.name}
          activityPages={sampleActivity.pages}
          currentPage={this.state.currentPage}
          onPageChange={this.handleChangePage}
        />
        <ProfileNavHeader
          name={"test student"}
        />
        { this.state.currentPage === 0
          ? this.renderIntroductionContent()
          : this.renderActivityContent(this.state.currentPage) }
      </React.Fragment>
    );
  }

  private renderIntroductionContent = () => {
    return (
      <React.Fragment>
        <div className="content" data-cy="intro-page-content">
          <SocialMediaLinks shareURL="https://concord.org/" />
          <div className="introduction">
            <ActivitySummary
              activityName={sampleActivity.name}
              introText={sampleActivity.description}
              time={sampleActivity.time_to_complete}
            />
            <ActivityPageLinks
              activityPages={sampleActivity.pages}
              onPageChange={this.handleChangePage}
            />
          </div>
        </div>
        <Footer/ >
      </React.Fragment>
    );
  }

  private renderActivityContent = (page: number) => {
    return (
      <div>{`page ${page}`}</div>
    );
  }

  private handleChangePage = (page: number) => {
    this.setState({currentPage: page});
  }

}
