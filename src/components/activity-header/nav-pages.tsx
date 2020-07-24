import React from "react";
import IconHome from "../../assets/svg-icons/icon-home.svg";

import "./nav-pages.scss";

interface IProps {
  pages: any[];
  currentPage: number;
  onPageChange: (page: number) => void;
}

export class NavPages extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="nav-pages" data-cy="nav-pages">
        { this.renderHomePageButton() }
        { this.props.pages.filter((page: any) => !page.is_hidden).map((page: any, index: number) => (
            this.renderPageButton(page, index)
          ))
        }
      </div>
    );
  }

  private renderHomePageButton = () => {
    const currentClass = this.props.currentPage === 0 ? "current" : "";
    return (
      <div className={`page-button ${currentClass}`} onClick={this.handleButtonClick(0)}>
        <IconHome
          width={18}
          height={18}
          fill={this.props.currentPage === 0 ? "white" : "#979797"}
        />
      </div>
    );
  }

  private renderPageButton = (page: any, index: number) => {
    const currentClass = this.props.currentPage === (index + 1) ? "current" : "";
    return (
      <div className={`page-button ${currentClass}`} key={`index ${index}`} onClick={this.handleButtonClick(index + 1)}>
        <div className={`label ${currentClass}`}>{(index + 1).toString()}</div>
      </div>
    );
  }

  private handleButtonClick = (page: number) => () => {
    this.props.onPageChange(page);
	}
}
