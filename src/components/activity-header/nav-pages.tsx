import React from "react";
import classNames from "classnames";
import { getPageHref, queryValue } from "../../utilities/url-query";
import { ActivityFeedback, Page } from "../../types";
import { pageHasFeedback, subscribeToActivityLevelFeedback, subscribeToQuestionLevelFeedback } from "../../utilities/feedback-utils";
import { TeacherFeedbackSmallBadge } from "../teacher-feedback/teacher-feedback-small-badge";
import ArrowPrevious from "../../assets/svg-icons/arrow-previous-icon.svg";
import ArrowNext from "../../assets/svg-icons/arrow-next-icon.svg";
import HiddenIcon from "../../assets/svg-icons/hidden-icon.svg";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import IconCompletion from "../../assets/svg-icons/icon-completion.svg";
import { QuestionInfoContext } from "../question-info-context";

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
}

interface IState {
  hasActivityLevelFeedback: boolean;
  pageChangeInProgress: boolean;
  pagesWithFeedback: number[];
}

export class NavPages extends React.Component <IProps, IState> {
  static contextType = QuestionInfoContext;

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
    const showNextPrevButtons = !this.props.hideNextPrevButtons;
    return (
      <ul className="nav-pages" data-cy="nav-pages">
        {showNextPrevButtons && this.renderPreviousButton()}
        {this.renderHomePageButton()}
        {this.renderButtons()}
        {showNextPrevButtons && this.renderNextButton()}
      </ul>
    );
  }

  private unsubscribeActivityLevelFeedback: (() => void) | undefined = undefined;
  private unsubscribeQuestionLevelFeedback: (() => void) | undefined = undefined;

  // Builds the href for the control that navigates to the given page position,
  // mirroring the position -> page-id lookup that a click ultimately performs
  // (see handleChangePage / getPageIDFromPosition in app.tsx) so the link and
  // the click resolve to the same destination. Position 0 (home) has no page param.
  private hrefForPosition = (position: number): string => {
    const pageId = position <= 0
      ? null
      : (this.props.pages.find((page) => page.position === position)?.id ?? null);
    return getPageHref(pageId);
  }

  private renderPreviousButton = () => {
    const { currentPage } = this.props;
    const { pageChangeInProgress } = this.state;
    const disabled = pageChangeInProgress || currentPage === 0;
    // When hard-disabled the target position is out of range, so clamp both the
    // link and the click handler to the current page rather than exposing (or
    // navigating to) a misleading destination. handlePageChangeRequest then
    // no-ops because the target equals currentPage.
    const targetPage = disabled ? currentPage : currentPage - 1;
    return (
      <li className="page-button-container">
        <a
          className={`page-button arrow-button ${disabled ? "last-page" : ""}`}
          href={this.hrefForPosition(targetPage)}
          onClick={this.handlePageChangeRequest(targetPage)}
          aria-label="Previous page"
          aria-disabled={disabled || undefined}
          data-cy="previous-page-button"
        >
          <ArrowPrevious className="icon" aria-hidden={true} focusable="false" />
        </a>
      </li>
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
    // aria-disabled mirrors the hard-disabled state only; the soft forward-lock
    // ("disabled" class) stays actionable so the incomplete-question warning fires.
    const disabled = pageChangeInProgress || currentPage === totalPages;
    // Clamp to currentPage when hard-disabled (see renderPreviousButton).
    const targetPage = disabled ? currentPage : currentPage + 1;
    return (
      <li className="page-button-container">
        <a
          className={nextButtonClass}
          href={this.hrefForPosition(targetPage)}
          onClick={this.handlePageChangeRequest(targetPage)}
          aria-label="Next page"
          aria-disabled={disabled || undefined}
          data-cy="next-page-button"
        >
          <ArrowNext className="icon" aria-hidden={true} focusable="false" />
        </a>
      </li>
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
                                ? <HiddenIcon className={`icon ${currentClass}`} width={28} height={28} aria-hidden={true} focusable="false" />
                                : page.is_completion
                                    ? <IconCompletion className={`icon ${currentClass}`} width={28} height={28} aria-hidden={true} focusable="false" />
                                    : pageLabel;

        return (
          pageNum >= minPage && pageNum <= maxPage
            ? <li className="page-button-container" key={`page-${pageNum}`}>
                <a
                  className={`page-button ${currentClass} ${completionClass} ${disabledClass}`}
                  href={this.hrefForPosition(pageNum)}
                  onClick={this.handlePageChangeRequest(pageNum)}
                  data-cy={`${page.is_completion ? "nav-pages-completion-page-button" : "nav-pages-button"}`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={currentPage === pageNum ? "page" : undefined}
                  aria-disabled={pageChangeInProgress || undefined}
                >
                  {buttonContent}
                </a>
                {hasFeedback && <TeacherFeedbackSmallBadge location="nav-pages" />}
              </li>
            // null (not "") so windowed-out pages render nothing rather than a
            // stray text node, keeping the <ul> to <li>-only children.
            : null
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
      <li className="page-button-container">
        <a
          className={`page-button ${currentClass} ${(pageChangeInProgress) ? "disabled" : ""}`}
          href={this.hrefForPosition(0)}
          onClick={this.handlePageChangeRequest(0)}
          aria-label="Home"
          aria-current={currentPage === 0 ? "page" : undefined}
          aria-disabled={pageChangeInProgress || undefined}
          data-cy="home-button"
        >
          <IconHome
            className={`icon ${this.props.currentPage === 0 ? "current" : ""}`}
            width={28}
            height={28}
            aria-hidden={true}
            focusable="false"
          />
          {this.props.usePageNames && "Home"}
        </a>
        {showFeedbackBadge && <TeacherFeedbackSmallBadge location="nav-pages" />}
      </li>
    );
  }

  private handlePageChangeRequest = (page: number) => (e?: React.MouseEvent) => {
    // Let the browser handle modified clicks (e.g. cmd/ctrl-click to open the
    // page in a new tab) natively via the anchor's href.
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      return;
    }
    e?.preventDefault();
    const { currentPage, lockForwardNav } = this.props;
    // No-op when the control targets the page we're already on: the current
    // page/Home control, or a hard-disabled prev/next whose target is clamped
    // to currentPage. These stay keyboard/AT-activatable (pointer-events:none
    // only blocks the mouse); re-navigating to the same page wouldn't change
    // currentPage, leaving pageChangeInProgress stuck and locking navigation.
    if (page === currentPage) {
      return;
    }
    const { pageChangeInProgress } = this.state;
    if (!pageChangeInProgress) {
      const allowPageChange = page < currentPage || !lockForwardNav;
      this.setState({ pageChangeInProgress: allowPageChange }, () => {
        this.props.onPageChange(page);
      });
    }
  }
}
