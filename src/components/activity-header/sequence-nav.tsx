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
    const indexedActivities = this.createIndexedActivitiesMap();
    return (
      <div className={`sequence-nav ${fullWidth ? "full" : ""}`} data-cy="sequence-nav-header">
        <div className="select-label">Activity:</div>
        { activities &&
          <CustomSelect
            items={activities.map((a, i) => `${i + 1}: ${a}`)}
            value={indexedActivities.get(currentActivity)}
            HeaderIcon={ActivityIcon}
            onSelectItem={this.handleSelect}
          />
        }
      </div>
    );
  }

  private createIndexedActivitiesMap = () => {
    const { activities } = this.props;
    const indexedActivities = new Map();
    activities?.forEach((a, i) => indexedActivities.set(`${i + 1}: ${a}`, a));
    return indexedActivities;
  }

  private handleSelect = (item: string) => {
    const { activities } = this.props;
    const indexedActivities = this.createIndexedActivitiesMap();
    const selectedActivity = indexedActivities.get(item);
    const activityIndex = activities?.findIndex((activity) => activity === selectedActivity);
    activityIndex && this.props.onActivityChange(activityIndex);
  }

}
