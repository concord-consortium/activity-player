import React from "react";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import ReactPaginate from "react-paginate";

import "./nav-pages.scss";
import { Page } from "../../types";

interface IProps {
  pages: Page[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export class NavPages extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="nav-pages" data-cy="nav-pages" >
        {this.renderHomePageButton()}
        <ReactPaginate
          previousLabel={"<"}
          nextLabel={">"}
          breakLabel={""}
          pageCount={this.props.pages.length}
          onPageChange={this.handlePaginate}
          marginPagesDisplayed={0}
          pageRangeDisplayed={10}
          containerClassName={"paginate-container"}
          pageLinkClassName={"page-button"}
          activeClassName={"current"}
          activeLinkClassName={"current"}
          forcePage={this.props.currentPage - 1}
          previousClassName={`${this.props.currentPage === 0 ? "disabled" : ""}`}
          previousLinkClassName={"page-button"}
          nextLinkClassName={"page-button"}
        />
      </div>
    );
  }

  private renderHomePageButton = () => {
    const currentClass = this.props.currentPage === 0 ? "current" : "";
    return (
      <button className={`page-button ${currentClass}`} onClick={this.handlePaginate}>
        <IconHome
          width={28}
          height={28}
          fill={this.props.currentPage === 0 ? "white" : "#979797"}
        />
      </button>
    );
  }

  private handlePaginate = (page: any) => {
    this.props.onPageChange(page.selected != null ? page.selected + 1 : 0);
  }
}
