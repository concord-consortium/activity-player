import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";

import { ActivityFeedback, Page } from "../../types";
import { pageHasFeedback, subscribeToActivityLevelFeedback, subscribeToQuestionLevelFeedback } from "../../utilities/feedback-utils";
import { TeacherFeedbackSmallBadge } from "../teacher-feedback/teacher-feedback-small-badge";
import { getPageHref } from "../../utilities/url-query";
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
        <ul className="page-list">
          { this.props.activityPages.filter((page) => !page.is_hidden).map((page, index: number) => {
              const hasFeedback = pageHasFeedback(page, this.state.pagesWithFeedback, this.state.hasActivityLevelFeedback);
              return (
                <li className="page-item-container" key={page.id}>
                  <a
                    className="page-item"
                    href={getPageHref(page.id)}
                    onClick={this.handlePageLinkClick(index + 1)}
                    title={hasFeedback ? "Your teacher left feedback on this page." : undefined}
                  >
                    <span>{`${index + 1}: `}</span>
                    <span className="page-link">{`${page.name ? page.name : "Page " + (index + 1)}`}</span>
                  </a>
                  {hasFeedback && <TeacherFeedbackSmallBadge location="page-links" />}
                </li>
              );
          })
          }
        </ul>
        <button
          className="button begin"
          onClick={this.handleBeginClick}
        >
          Begin Activity
        </button>
      </div>
    );
  }

  private handlePageLinkClick = (page: number) => (e: React.MouseEvent) => {
    // Let the browser handle modified clicks (e.g. cmd/ctrl-click to open the
    // page in a new tab) natively via the anchor's href.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return;
    }
    e.preventDefault();
    this.props.onPageChange(page);
  }

  // The Begin Activity button is not a link (no href), so it always navigates
  // in-app regardless of any modifier key the user happens to be holding.
  private handleBeginClick = () => {
    this.props.onPageChange(1);
  }

  private unsubscribeActivityLevelFeedback: (() => void) | undefined = undefined;
  private unsubscribeQuestionLevelFeedback: (() => void) | undefined = undefined;

}
