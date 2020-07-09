import React from "react";

import "./activity-page-links.scss";

interface IProps {
  activityPages: any[];
  onPageChange: (page: number) => void;
}

export class ActivityPageLinks extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="activity-page-links" data-cy="activity-page-links">
        <div className="pages">Pages in this Activity</div>
        { this.props.activityPages.map((page: any, index: number) => (
          <div className="page-item" key={`index ${index}`} onClick={this.handleButtonClick(index + 1)}>
            <span>{`${index + 1}. `}</span>
            <span className="page-link" onClick={this.handleButtonClick(index + 1)}>{`Page ${index + 1}`}</span>
          </div>
          ))
        }
        <button className="begin" onClick={this.handleButtonClick(1)}>Begin Activity</button>
      </div>
    );
  }

  private handleButtonClick = (page: number) => () => {
    this.props.onPageChange(page);
	}
}
