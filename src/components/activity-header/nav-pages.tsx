import React from "react";
import classNames from "classnames";
import { queryValue } from "../../utilities/url-query";
import { ActivityFeedback, Page, QuestionMap } from "../../types";
import { pageHasFeedback, subscribeToActivityLevelFeedback, subscribeToQuestionLevelFeedback } from "../../utilities/feedback-utils";
import { TeacherFeedbackSmallBadge } from "../teacher-feedback/teacher-feedback-small-badge";
import ArrowPrevious from "../../assets/svg-icons/arrow-previous-icon.svg";
import ArrowNext from "../../assets/svg-icons/arrow-next-icon.svg";
import HiddenIcon from "../../assets/svg-icons/hidden-icon.svg";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import IconCompletion from "../../assets/svg-icons/icon-completion.svg";

import "./nav-pages.scss";

const kMaxPageNavigationButtons = 11;

interface IProps {
  activityId?: number | null;
  pages: Page[];
  currentPage: number;
  onPageChange: (page: number) => void;
  lockForwardNav?: boolean;
  usePageNames?: boolean;
  hideNextPrevButtons?: boolean;
  isSequence?: boolean;
  questionMap?: QuestionMap;
}

interface IState {
  hasActivityLevelFeedback: boolean;
  pageChangeInProgress: boolean;
  pagesWithFeedback: number[];
}

export class NavPages extends React.Component <IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      hasActivityLevelFeedback: false,
      pageChangeInProgress: false,
      pagesWithFeedback: [],
    };
  }

  componentDidUpdate(prevProps: IProps) {
    if (prevProps.currentPage !== this.props.currentPage) {
      // Unlock buttons after page has been changed.
      this.setState({ pageChangeInProgress: false });
    }
  }

  componentDidMount() {
    if (this.props.activityId) {
      const { activityId, isSequence=false, questionMap } = this.props;

      this.unsubscribeActivityLevelFeedback = subscribeToActivityLevelFeedback({
        activityId,
        isSequence,
        callback: (feedback: ActivityFeedback | null) => this.setState({ hasActivityLevelFeedback: !!feedback })
      });

      this.unsubscribeQuestionLevelFeedback = subscribeToQuestionLevelFeedback({
        activityId,
        isSequence,
        questionMap,
        callback: (pageIds: number[]) => this.setState({ pagesWithFeedback: pageIds })
      });
    }
  }

  componentWillUnmount() {
    this.unsubscribeActivityLevelFeedback?.();
    this.unsubscribeQuestionLevelFeedback?.();
  }

  render() {
    const showNextPrevButtons = !this.props.hideNextPrevButtons;
    return (
      <div className="nav-pages" data-cy="nav-pages">
        {showNextPrevButtons && this.renderPreviousButton()}
        {this.renderHomePageButton()}
        {this.renderButtons()}
        {showNextPrevButtons && this.renderNextButton()}
      </div>
    );
  }

  private unsubscribeActivityLevelFeedback: (() => void) | undefined = undefined;
  private unsubscribeQuestionLevelFeedback: (() => void) | undefined = undefined;

  private renderPreviousButton = () => {
    const { currentPage } = this.props;
    const { pageChangeInProgress } = this.state;
    return (
      <div className="page-button-container">
        <button
          className={`page-button arrow-button ${pageChangeInProgress || currentPage === 0 ? "last-page" : ""}`}
          onClick={this.handlePageChangeRequest(currentPage - 1)}
          aria-label="Previous page"
          data-cy="previous-page-button"
        >
          <ArrowPrevious className="icon"/>
        </button>
      </div>
    );
  }

  private renderNextButton = () => {
    const { currentPage, pages, lockForwardNav } = this.props;
    const { pageChangeInProgress } = this.state;
    const visiblePages = queryValue("author-preview") ? pages : pages.filter((page) => !page.is_hidden);
    const totalPages = visiblePages.length;
    // 'disabled' class disables navigation but still allows user to click on arrows or page numbers for warning modal to come up
    // 'last-page' class disables pointer events.
    const nextButtonClass = classNames("page-button", "arrow-button",
                                        {"disabled": pageChangeInProgress || lockForwardNav || currentPage === totalPages},
                                        {"last-page": currentPage === totalPages});
    return (
      <div className="page-button-container">
        <button
          className={nextButtonClass}
          onClick={this.handlePageChangeRequest(currentPage + 1)}
          aria-label="Next page"
          data-cy="next-page-button"
        >
          <ArrowNext className="icon"/>
        </button>
      </div>
    );
  }

  private renderButtons = () => {
    const { currentPage, pages, lockForwardNav } = this.props;
    const { pageChangeInProgress } = this.state;
    const visiblePages = queryValue("author-preview") ? pages : pages.filter((page) => !page.is_hidden);
    const totalPages = visiblePages.length;
    const maxPagesLeftOfCurrent = currentPage - 1;
    const maxPagesRightOfCurrent = totalPages - currentPage;
    let minPage = 1;
    let maxPage = totalPages;
    const maxButtonsPerSide = Math.floor(kMaxPageNavigationButtons / 2);
    if (maxPagesLeftOfCurrent < maxButtonsPerSide) {
      maxPage = Math.min(totalPages, currentPage + maxButtonsPerSide + (maxButtonsPerSide - maxPagesLeftOfCurrent));
    } else if (maxPagesRightOfCurrent < maxButtonsPerSide) {
      minPage = Math.max(1, currentPage - maxButtonsPerSide - (maxButtonsPerSide - maxPagesRightOfCurrent));
    } else if (totalPages > kMaxPageNavigationButtons) {
      minPage = currentPage - maxButtonsPerSide;
      maxPage = currentPage + maxButtonsPerSide;
    }

    return (
      visiblePages.map((page: Page, pageIndex: number, pageArray: Page[]) => {
        const hiddenPagesBefore = pageArray.filter((p, index) => p.is_hidden && index < pageIndex ).length;
        const pageNum = pageIndex + 1;
        const visiblePageLabel = pageNum - hiddenPagesBefore;
        const pageLabel = this.props.usePageNames ? (page.name || visiblePageLabel) : visiblePageLabel;
        const hasFeedback = pageHasFeedback(page, this.state.pagesWithFeedback, this.state.hasActivityLevelFeedback);
        const currentClass = currentPage === pageNum ? "current" : "";
        const completionClass = page.is_completion ? "completion-page-button" : "";
        const disabledClass = (pageChangeInProgress || lockForwardNav && currentPage < pageNum) ? "disabled" : "";
        const buttonContent = page.is_hidden
                                ? <HiddenIcon className={`icon ${currentClass}`} width={28} height={28}/>
                                : page.is_completion
                                    ? <IconCompletion className={`icon ${currentClass}`} width={28} height={28} />
                                    : pageLabel;

        return (
          pageNum >= minPage && pageNum <= maxPage
            ? <div className="page-button-container" key={`page-${pageNum}`}>
                <button
                  className={`page-button ${currentClass} ${completionClass} ${disabledClass}`}
                  onClick={this.handlePageChangeRequest(pageNum)}
                  data-cy={`${page.is_completion ? "nav-pages-completion-page-button" : "nav-pages-button"}`}
                  aria-label={`Page ${pageNum}`}
                >
                  {buttonContent}
                </button>
                {hasFeedback && <TeacherFeedbackSmallBadge location="nav-pages" />}
              </div>
            : ""
        );
      })
    );
  }

  private renderHomePageButton = () => {
    const { currentPage, pages } = this.props;
    const { hasActivityLevelFeedback, pageChangeInProgress, pagesWithFeedback } = this.state;
    const currentClass = currentPage === 0 ? "current" : "";
    const hasCompletionPage = pages.find((page: Page) => page.is_completion);
    const showFeedbackBadge = !hasCompletionPage && (hasActivityLevelFeedback || pagesWithFeedback.length > 0);

    return (
      <div className="page-button-container">
        <button className={`page-button ${currentClass} ${(pageChangeInProgress) ? "disabled" : ""}`}
                onClick={this.handlePageChangeRequest(0)}
                aria-label="Home"
                data-cy="home-button"
        >
          {this.props.usePageNames &&
            <>
              <IconHome
                className={`icon ${this.props.currentPage === 0 ? "current" : ""}`}
                width={28}
                height={28}
              />
              Home
            </>
            }
          {!this.props.usePageNames && <IconHome
            className={`icon ${this.props.currentPage === 0 ? "current" : ""}`}
            width={28}
            height={28}
          />}
        </button>
        {showFeedbackBadge && <TeacherFeedbackSmallBadge location="nav-pages" />}
      </div>
    );
  }

  private handlePageChangeRequest = (page: number) => () => {
    const { currentPage, lockForwardNav } = this.props;
    const { pageChangeInProgress } = this.state;
    if (!pageChangeInProgress) {
      const allowPageChange = page < currentPage || !lockForwardNav;
      this.setState({ pageChangeInProgress: allowPageChange }, () => {
        this.props.onPageChange(page);
      });
    }
  }
}
