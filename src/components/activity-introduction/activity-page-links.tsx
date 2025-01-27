import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";

import { ActivityFeedback, Page } from "../../types";
import { pageHasFeedback, subscribeToActivityLevelFeedback, subscribeToQuestionLevelFeedback } from "../../utilities/feedback-utils";
import { TeacherFeedbackSmallBadge } from "../teacher-feedback/teacher-feedback-small-badge";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import { QuestionInfoContext } from "../question-info-context";

import "./activity-page-links.scss";

interface IProps {
  activityId?: number | null;
  activityPages: Page[];
  isSequence?: boolean;
  onPageChange: (page: number) => void;
}

interface IState {
  hasActivityLevelFeedback: boolean;
  pagesWithFeedback: number[];
}

export class ActivityPageLinks extends React.PureComponent <IProps, IState> {
  static contextType = QuestionInfoContext;

  constructor(props: IProps) {
    super(props);
    this.state = {
      hasActivityLevelFeedback: false,
      pagesWithFeedback: [],
    };
  }

  componentDidMount() {
    if (this.props.activityId) {
      const { activityId, isSequence=false } = this.props;

      this.unsubscribeActivityLevelFeedback = subscribeToActivityLevelFeedback({
        activityId,
        isSequence,
        callback: (feedback: ActivityFeedback | null) => this.setState({ hasActivityLevelFeedback: !!feedback })
      });

      this.unsubscribeQuestionLevelFeedback = subscribeToQuestionLevelFeedback({
        activityId,
        isSequence,
        questionMap: this.context.questionMap,
        callback: (pageIds: number[]) => this.setState({ pagesWithFeedback: pageIds })
      });
    }
  }

  componentWillUnmount() {
    this.unsubscribeActivityLevelFeedback?.();
    this.unsubscribeQuestionLevelFeedback?.();
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

  private unsubscribeActivityLevelFeedback: (() => void) | undefined = undefined;
  private unsubscribeQuestionLevelFeedback: (() => void) | undefined = undefined;

}
