import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";

import { ActivityFeedback, Page } from "../../types";
import { QuestionToActivityMap } from "../app";
import { pageHasFeedback, subscribeToActivityLevelFeedback, subscribeToQuestionLevelFeedback } from "../../utilities/feedback-utils";
import { TeacherFeedbackSmallBadge } from "../teacher-feedback/teacher-feedback-small-badge";
import { accessibilityClick } from "../../utilities/accessibility-helper";

import "./activity-page-links.scss";

interface IProps {
  activityId?: number | null;
  activityPages: Page[];
  isSequence?: boolean;
  questionToActivityMap?: QuestionToActivityMap;
  onPageChange: (page: number) => void;
}

interface IState {
  hasActivityLevelFeedback: boolean;
  pagesWithFeedback: number[];
}

export class ActivityPageLinks extends React.PureComponent <IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      hasActivityLevelFeedback: false,
      pagesWithFeedback: [],
    };
  }

  componentDidMount() {
    if (this.props.activityId) {
      this.unsubscribeFromActivityLevelFeedback = subscribeToActivityLevelFeedback(
        this.props.activityId,
        !!this.props.isSequence,
        (feedback: ActivityFeedback | null) => this.setState({ hasActivityLevelFeedback: !!feedback })
      );

      this.unsubscribeFromQuestionLevelFeedback = subscribeToQuestionLevelFeedback(
        this.props.activityId,
        !!this.props.isSequence,
        (pageIds: number[]) => this.setState({ pagesWithFeedback: pageIds }),
        this.props.questionToActivityMap
      );
    }
  }

  componentWillUnmount() {
    if (this.unsubscribeFromActivityLevelFeedback) {
      this.unsubscribeFromActivityLevelFeedback();
    }

    if (this.unsubscribeFromQuestionLevelFeedback) {
      this.unsubscribeFromQuestionLevelFeedback();
    }
  }

  render() {
    return (
      <div className="activity-page-links" data-cy="activity-page-links">
        <div className="pages"><DynamicText>Pages in this Activity</DynamicText></div>
        <div className="separator" />
        { this.props.activityPages.filter((page) => !page.is_hidden).map((page, index: number) => {
            const hasFeedback = pageHasFeedback(page, this.state.pagesWithFeedback, this.state.hasActivityLevelFeedback);
            return (
              <div
                className="page-item"
                key={`index ${index}`}
                onClick={this.handlePageChange(index + 1)}
                onKeyDown={this.handlePageChange(index + 1)}
                tabIndex={0}
              >
                <span>{`${index + 1}:`}</span>
                <span className="page-link">{`${page.name ? page.name : "Page " + (index + 1)}`}</span>
                {hasFeedback && <TeacherFeedbackSmallBadge location="page-links" />}
              </div>
            );
        })
        }
        <button
          className="button begin"
          onClick={this.handlePageChange(1)}
          onKeyDown={this.handlePageChange(1)}
        >
          Begin Activity
        </button>
      </div>
    );
  }

  private handlePageChange = (page: number) => () => {
    if (accessibilityClick(event)) {
      this.props.onPageChange(page);
    }
  }

  private unsubscribeFromActivityLevelFeedback: (() => void) | undefined = undefined;
  private unsubscribeFromQuestionLevelFeedback: (() => void) | undefined = undefined;

}
