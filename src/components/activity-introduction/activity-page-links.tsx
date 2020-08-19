import React from "react";

import "./activity-page-links.scss";
import { Page } from "../../types";
import { accessibilityClick } from "../../utilities/accessibility-helper";

interface IProps {
  activityPages: Page[];
  onPageChange: (page: number) => void;
}

export class ActivityPageLinks extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="activity-page-links" data-cy="activity-page-links">
        <div className="pages">Pages in this Activity</div>
        { this.props.activityPages.filter((page) => !page.is_hidden).map((page, index: number) => (
          <div className="page-item" key={`index ${index}`} onClick={this.handleButtonClick(index + 1)} onKeyDown={this.handleButtonClick(index + 1)}>
            <span>{`${index + 1}. `}</span>
            <span className="page-link" onClick={this.handleButtonClick(index + 1)} onKeyDown={this.handleButtonClick(index + 1)} tabIndex={0}>{`Page ${index + 1}`}</span>
          </div>
          ))
        }
        <button className="button begin" onClick={this.handleButtonClick(1)} onKeyDown={this.handleButtonClick(1)}>Begin Activity</button>
      </div>
    );
  }

  private handleButtonClick = (page: number) => () => {
    if ( accessibilityClick(event) ) {
      this.props.onPageChange(page);
    }
	}
}
