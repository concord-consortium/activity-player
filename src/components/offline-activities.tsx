import React from "react";
import { getActivityDefinition } from "../lara-api";
import { getOfflineActivities } from "../offline-manifest-api";
import { Activity, OfflineActivity } from "../types";
import { Header } from "./activity-header/header";

import "./offline-activities.scss";

const OfflineActivityListRow = (props: {activity: OfflineActivity;  onSelectOfflineActivity: (activity: OfflineActivity) => void}) => {
  const handleSelectActivity = () => props.onSelectOfflineActivity(props.activity);
  return (
    <tr>
      <td>TDB</td>
      <td onClick={handleSelectActivity} className="activity">{props.activity.name}</td>
    </tr>
  );
};

interface IProps {
  username: string;
  onSelectActivity: (activity: Activity, resourceUrl: string, contentUrl: string) => void;
}

interface IState {
  loading: boolean;
  offlineActivities: OfflineActivity[]
}

export class OfflineActivities extends React.Component<IProps, IState> {

  constructor (props: IProps) {
    super(props);
    this.state = {
      loading: true,
      offlineActivities: []
    };
  }

  async UNSAFE_componentWillMount() {
    const offlineActivities = await getOfflineActivities();
    this.setState({offlineActivities, loading: false});
  }

  handleSelectOfflineActivity = async (offlineActivity: OfflineActivity) => {
    const { onSelectActivity } = this.props;
    try {
      const activity = await getActivityDefinition(offlineActivity.contentUrl);
      onSelectActivity(activity, offlineActivity.resourceUrl, offlineActivity.contentUrl);
    } catch (e) {
      alert("Error loading activity!");
    }
  }

  renderNoActivitiesFound() {
    return (
      <div>Sorry, no offline activities were found!</div>
    );
  }

  renderTable() {
    const { offlineActivities } = this.state;
    return (
      <table>
        <thead>
          <tr>
            <th>Class</th>
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {offlineActivities.map(offlineActivity =>
            <OfflineActivityListRow key={offlineActivity.resourceUrl} activity={offlineActivity} onSelectOfflineActivity={this.handleSelectOfflineActivity} />
          )}
        </tbody>
      </table>
    );
  }

  render() {
    const { username } = this.props;
    const { loading, offlineActivities } = this.state;

    return (
      <div className="offline-activities" data-cy="offline-activities">
        <Header
          fullWidth={false}
          projectId={null}
          userName={username}
          contentName="Offline Activities"
          skipTitlePrefix={true}
        />
        <div className="offline-content">
          { loading ? "Loading..." : (offlineActivities.length === 0 ? this.renderNoActivitiesFound() : this.renderTable())}
        </div>
      </div>
    );
  }
}
