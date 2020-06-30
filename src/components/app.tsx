import React from "react";
import { Header } from "./activity-header/header";
import { ActivityNavHeader } from "./activity-header/activity-nav-header";
import { ProfileNavHeader } from "./activity-header/profile-nav-header";
import { ActivityPageContent } from "./activity-page/activity-page-content";
import { IntroductionPageContent } from "./activity-introduction/introduction-page-content";
import Footer from "./activity-introduction/footer";
import sampleActivity from "../data/sample-activity-multiple-layout-types.json";

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
    const { currentPage } = this.state;
    let totalPreviousQuestions = 0;

    for (let page = 0; page < (currentPage - 1); page++) {
      for (let embeddable = 0; embeddable < sampleActivity.pages[page].embeddables.length; embeddable++) {
        if (!sampleActivity.pages[page].embeddables[embeddable].section) {
          totalPreviousQuestions++;
        }
      }
    }

    const fullWidth = currentPage!==0 && (sampleActivity.pages[currentPage - 1].layout === "l-responsive");

    return (
      <React.Fragment>
        <Header
          fullWidth={fullWidth}
          projectId={sampleActivity.project_id}
        />
        <ActivityNavHeader
          activityName={sampleActivity.name}
          activityPages={sampleActivity.pages}
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
              isLastActivityPage={currentPage === sampleActivity.pages.length}
              pageNumber={currentPage}
              onPageChange={this.handleChangePage}
              page={sampleActivity.pages[currentPage - 1]}
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
          activity={sampleActivity}
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
