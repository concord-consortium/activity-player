import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";

import { EstimatedTime } from "./estimated-time";
import { renderHTML } from "../../utilities/render-html";
import { ReadAloudToggle } from "../read-aloud-toggle";

import "./activity-summary.scss";

interface IProps {
  activityName: string;
  introText: string | null;
  time: number | null;
  imageUrl: string | null;
  readAloud?: boolean;
  setReadAloud?: (readAloud: boolean) => void;
  readAloudDisabled?: boolean;
}

export class ActivitySummary extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="activity-summary" data-cy="activity-summary">
        <div className="activity-title">
          { this.props.imageUrl && <img src={this.props.imageUrl} alt="Activity logo" /> }
          <h1><DynamicText>{this.props.activityName}</DynamicText></h1>
          {this.props.setReadAloud && <ReadAloudToggle
            disabled={this.props.readAloudDisabled}
            isChecked={this.props.readAloud || false}
            onChange={this.props.setReadAloud}
          />}
        </div>
        <DynamicText>
          <div className="activity-content intro-txt">
            { this.props.introText && renderHTML(this.props.introText)}
          </div>
        </DynamicText>
        { this.props.time && <EstimatedTime time={this.props.time} /> }
      </div>
    );
  }
}
