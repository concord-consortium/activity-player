import React from "react";
import { EstimatedTime } from "./estimated-time";

interface IProps {
  activityName: string;
  introText: string;
  time: number;
}

export class ActivitySummary extends React.PureComponent <IProps> {
  render() {
    const nameHeader = `<h2>${this.props.activityName}</h2>`;
    return (
      <div className="activity-summary" data-cy="activity-summary">
        <div className="content" dangerouslySetInnerHTML={{ __html: nameHeader + this.props.introText}} />
        <EstimatedTime time={this.props.time} />
      </div>
    );
  }
}
