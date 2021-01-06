import React from "react";
import { CustomSelect } from "../custom-select";
import ActivityIcon from "../../assets/svg-icons/activity-icon.svg";

import "./sequence-nav.scss";

interface IProps {
  activities?: string[],
  currentActivity?: string;
  onActivityChange: (activityNum: number) => void;
  fullWidth?: boolean;
}

export class SequenceNav extends React.PureComponent <IProps> {

  render() {
    const { activities, fullWidth, currentActivity } = this.props;
    return (
      <div className={`sequence-nav ${fullWidth ? "full" : ""}`} data-cy="sequence-nav-header">
        <div className="select-label">Activity:</div>
        { activities &&
          <CustomSelect
            items={activities}
            value={currentActivity}
            HeaderIcon={ActivityIcon}
            onSelectItem={this.handleSelect}
          />
        }
      </div>
    );
  }

  private handleSelect = (item: string) => {
    const activityIndex = this.props.activities?.findIndex((activity) => activity === item);
    activityIndex && this.props.onActivityChange(activityIndex);
  }

}
