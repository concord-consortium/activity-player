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
          breakLabel={"..."}
          breakLinkClassName={"page-button"}
          pageCount={this.props.pages.length}
          onPageChange={this.handlePaginate}
          marginPagesDisplayed={2}
          pageRangeDisplayed={5}
          containerClassName={"paginate-container"}
          pageClassName={""}
          pageLinkClassName={"page-button"}
          activeClassName={"current"}
          activeLinkClassName={"current"}
          initialPage={this.props.currentPage - 1}
          forcePage={this.props.currentPage - 1}
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
    if (page.selected >= 0) {
      this.props.onPageChange(page.selected + 1);
    } else {
      this.props.onPageChange(0);
    }
  }
}
