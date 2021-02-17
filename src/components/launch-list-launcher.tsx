import React from "react";
import { getActivityDefinition } from "../lara-api";
import { Activity, LaunchList, LaunchListActivity } from "../types";

import "./launch-list-launcher.scss";

const LaunchListLauncherDialogItem = (props: {activity: LaunchListActivity;  onSelectLaunchListActivity: (activity: LaunchListActivity) => void}) => {
  const handleSelectActivity = () => props.onSelectLaunchListActivity(props.activity);
  return (
    <li onClick={handleSelectActivity}>{props.activity.name}</li>
  );
};

interface IProps {
  launchList: LaunchList;
  onSelectActivity: (activity: Activity, url: string) => void;
}

export class LaunchListLauncherDialog extends React.PureComponent<IProps> {

  handleSelectLaunchListActivity = async (launchListActivity: LaunchListActivity) => {
    const { onSelectActivity } = this.props;
    try {
      const activity = await getActivityDefinition(launchListActivity.url);
      onSelectActivity(activity, launchListActivity.url);
    } catch (e) {
      alert("Error loading activity!");
    }
  }

  render() {
    const { launchList } = this.props;

    return (
      <div className="launch-list-launcher" data-cy="launch-list-launcher">
        <div className="background" />
        <div className="dialog">
          <div>
            Select a <strong>{launchList.name} activity ...</strong>
          </div>
          <div>
            <ul>
              {launchList.activities.map(activity =>
                <LaunchListLauncherDialogItem key={activity.url} activity={activity} onSelectLaunchListActivity={this.handleSelectLaunchListActivity} />
              )}
            </ul>
          </div>
        </div>
      </div>
    );
  }
}
