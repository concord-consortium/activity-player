import React from "react";
import { DynamicText } from "@concord-consortium/dynamic-text";

import IconClock from "../../assets/svg-icons/estimated-time-icon.svg";

import "./estimated-time.scss";

interface IProps {
  time: number;
}

export class EstimatedTime extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="estimated-time" data-cy="estimated-time">
        <IconClock />
        <DynamicText>
          <div className="label">
            <div className="estimate">Estimated Time to Complete This Module:</div>
            <div className="time">{`${this.props.time} minutes`}</div>
          </div>
        </DynamicText>
      </div>
    );
  }
}
