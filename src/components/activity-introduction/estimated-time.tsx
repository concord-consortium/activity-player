import React from "react";
import IconClock from "../../assets/svg-icons/icon-clock.svg";

import './estimated-time.scss';

interface IProps {
  time: number;
}

export class EstimatedTime extends React.PureComponent <IProps> {
  render() {
    return (
      <div className="estimated-time" data-cy="estimated-time">
        <IconClock
          width={32}
          height={32}
          fill={"black"}
        />
        <div className="label">
          <div className="estimate">Estimated Time to Complete This Module:</div>
          <div className="time">{this.props.time}</div>
          <div className="minutes">minutes</div>
        </div>
      </div>
    );
  }
}
