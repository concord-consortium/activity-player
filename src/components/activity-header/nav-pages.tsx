import React from "react";
import { queryValue } from "../../utilities/url-query";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import IconCompletion from "../../assets/svg-icons/icon-completion.svg";
import { Page } from "../../types";
import ArrowPrevious from "../../assets/svg-icons/arrow-previous-icon.svg";
import ArrowNext from "../../assets/svg-icons/arrow-next-icon.svg";
import HiddenIcon from "../../assets/svg-icons/hidden-icon.svg";

import "./nav-pages.scss";

const kMaxPageNavigationButtons = 11;

interface IProps {
  pages: Page[];
  currentPage: number;
  onPageChange: (page: number) => void;
  lockForwardNav?: boolean;
}

interface IState {
  pageChangeInProgress: boolean;
}

export class NavPages extends React.Component <IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      pageChangeInProgress: false
    };
  }

  componentDidUpdate(prevProps: IProps) {
    if (prevProps.currentPage !== this.props.currentPage) {
      // Unlock buttons after page has been changed.
      this.setState({ pageChangeInProgress: false });
    }
  }

  render() {
    return (
      <div className="nav-pages" data-cy="nav-pages">
        {this.renderPreviousButton()}
        {this.renderHomePageButton()}
        {this.renderButtons()}
        {this.renderNextButton()}
      </div>
    );
  }

  private renderPreviousButton = () => {
    const { currentPage } = this.props;
    const { pageChangeInProgress } = this.state;
    return (
      <button
        className={`page-button arrow-button ${pageChangeInProgress || currentPage === 0 ? "disabled" : ""}`}
        onClick={this.handleChangePage(currentPage - 1)}
        aria-label="Previous page"
      >
        <ArrowPrevious className="icon"/>
      </button>
    );
  }
  private renderNextButton = () => {
    const { currentPage, pages, lockForwardNav } = this.props;
    const { pageChangeInProgress } = this.state;
    const visiblePages = queryValue("author-preview") ? pages : pages.filter((page) => !page.is_hidden);
    const totalPages = visiblePages.length;
    return (
      <button
        className={`page-button arrow-button ${pageChangeInProgress || currentPage === totalPages || lockForwardNav ? "disabled" : ""}`}
        onClick={this.handleChangePage(currentPage + 1)}
        aria-label="Next page"
      >
        <ArrowNext className="icon"/>
      </button>
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
        const pageLabel = pageNum - hiddenPagesBefore;
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
            ? <button
                className={`page-button ${currentClass} ${completionClass} ${disabledClass}`}
                onClick={this.handleChangePage(pageNum)}
                key={`page ${pageNum}`}
                data-cy={`${page.is_completion ? "nav-pages-completion-page-button" : "nav-pages-button"}`}
                aria-label={`Page ${pageNum}`}
              >
                {buttonContent}
              </button>
            : ""
        );
      })
    );
  }

  private renderHomePageButton = () => {
    const currentClass = this.props.currentPage === 0 ? "current" : "";
    const { pageChangeInProgress } = this.state;
    return (
      <button className={`page-button ${currentClass} ${(pageChangeInProgress) ? "disabled" : ""}`} onClick={this.handleChangePage(0)} aria-label="Home">
        <IconHome
          className={`icon ${this.props.currentPage === 0 ? "current" : ""}`}
          width={28}
          height={28}
        />
      </button>
    );
  }

  private handleChangePage = (page: number) => () => {
    if (!this.state.pageChangeInProgress) {
      this.setState({ pageChangeInProgress: true }, () => {
        this.props.onPageChange(page);
      });
    }
  }
}
