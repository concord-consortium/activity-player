import React from "react";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import { Page } from "../../types";
import ArrowPrevious from "../../assets/svg-icons/arrow-previous-icon.svg";
import ArrowNext from "../../assets/svg-icons/arrow-next-icon.svg";

import "./nav-pages.scss";

const kMaxPageNavigationButtons = 11;

interface IProps {
  pages: Page[];
  currentPage: number;
  onPageChange: (page: number) => void;
  lockForwardNav?: boolean;
}

export class NavPages extends React.PureComponent <IProps> {
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
    return (
      <button
        className={`page-button ${currentPage === 0 ? "disabled" : ""}`}
        onClick={this.handleChangePage(currentPage - 1)}
        aria-label="Previous page"
      >
        <ArrowPrevious className="icon"/>
      </button>
    );
  }
  private renderNextButton = () => {
    const { currentPage, pages, lockForwardNav } = this.props;
    const totalPages = pages.length;
    return (
      <button
        className={`page-button ${currentPage === totalPages || lockForwardNav ? "disabled" : ""}`}
        onClick={this.handleChangePage(currentPage + 1)}
        aria-label="Next page"
      >
        <ArrowNext className="icon"/>
      </button>
    );
  }

  private renderButtons = () => {
    const { currentPage, pages, lockForwardNav } = this.props;
    const totalPages = pages.length;
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
    const pageNums: number[] = [];
    for (let i = minPage; i <= maxPage; i++) {
      pageNums.push(i);
    }
    return (
      pageNums.map((page: number) =>
        <button
          className={`page-button ${currentPage === page ? "current" : ""} ${(lockForwardNav && currentPage < page) ? "disabled" : ""}`}
          onClick={this.handleChangePage(page)}
          key={`page ${page}`}
          data-cy="nav-pages-button"
          aria-label={`Page ${page}`}
        >
          {page}
        </button>
      )
    );
  }

  private renderHomePageButton = () => {
    const currentClass = this.props.currentPage === 0 ? "current" : "";
    return (
      <button className={`page-button ${currentClass}`} onClick={this.handleChangePage(0)} aria-label="Home">
        <IconHome
          className={`icon ${this.props.currentPage === 0 ? "current" : ""}`}
          width={28}
          height={28}
        />
      </button>
    );
  }

  private handleChangePage = (page: number) => () => {
    this.props.onPageChange(page);
  }
}
