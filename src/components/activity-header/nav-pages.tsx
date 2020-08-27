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

export class NavPages extends React.PureComponent<IProps> {
  render() {
    return (
      <div className="nav-pages" data-cy="nav-pages" >
        {this.renderHomePageButton()}
        <ReactPaginate
          previousLabel={""}
          nextLabel={""}
          breakLabel={"..."}
          breakClassName={"gap"}
          pageCount={this.props.pages.length}
          onPageChange={this.handlePaginateClick}
          marginPagesDisplayed={1}
          pageRangeDisplayed={13}
          containerClassName={"paginate-container"}
          pageClassName = {"hide-dot"}
          pageLinkClassName={"page-button"}
          activeClassName = {"hide-dot"}
          activeLinkClassName={"current"}
          initialPage={-1}
          previousClassName = {"hide-li"}
          nextClassName = {"hide-li"}
        />
      </div>
    );
  }

  private renderHomePageButton = () => {
    const currentClass = this.props.currentPage === 0 ? "current" : "";
    return (
        <button className={`page-button ${currentClass}`} onClick={this.handlePaginateClick}>
          <IconHome
            width={28}
            height={28}
            fill={this.props.currentPage === 0 ? "white" : "#979797"}
          />
        </button>
    );
  }

  private handlePaginateClick = (page: any) => {
    if(page.selected>=0) {
      this.props.onPageChange(page.selected+1);
    } else {
      this.props.onPageChange(0);
    }
  }
}
