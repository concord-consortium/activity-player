import React from "react";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import { Page } from "../../types";

import "./nav-pages.scss";

const kMaxPages = 11;

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
        {this.renderHomePageButton()}
        {this.renderPreviousButton()}
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
      >
        {"<"}
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
      >
        {">"}
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
    if (maxPagesLeftOfCurrent < 5) {
      maxPage = Math.min(totalPages, currentPage + 5 + (5 - maxPagesLeftOfCurrent));
    } else if (maxPagesRightOfCurrent < 5) {
      minPage = Math.max(1, currentPage - 5 - (5 - maxPagesRightOfCurrent));
    } else if (totalPages > kMaxPages) {
      minPage = currentPage - 5;
      maxPage = currentPage + 5;
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
        >
          {page}
        </button>
      )
    );
  }

  private renderHomePageButton = () => {
    const currentClass = this.props.currentPage === 0 ? "current" : "";
    return (
      <button className={`page-button ${currentClass}`} onClick={this.handleChangePage(0)}>
        <IconHome
          width={28}
          height={28}
          fill={this.props.currentPage === 0 ? "white" : "#979797"}
        />
      </button>
    );
  }

  private handleChangePage = (page: number) => () => {
    this.props.onPageChange(page);
  }
}
