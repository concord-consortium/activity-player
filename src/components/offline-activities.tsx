import React from "react";
import { getOfflineActivities } from "../offline-manifest-api";
import { OfflineActivity } from "../types";
import { Header } from "./activity-header/header";

import "./offline-activities.scss";

const OfflineActivityListRow = (props: {activity: OfflineActivity}) => {
  const {name, manifestName, contentUrl, resourceUrl} = props.activity;
  const displayName = manifestName.length > 0 ? `${manifestName}: ${name}` : name;
  return (
    <tr>
      {
        // Add class column back at a later date
        // <td>TDB</td>
      }
      <td className="activity">
        <a href={`?activity=${encodeURIComponent(resourceUrl)}&contentUrl=${encodeURIComponent(contentUrl)}`}>{displayName}</a>
      </td>
    </tr>
  );
};

interface IProps {
  username: string;
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
            {
              // Add class column back at a later date
              // <th>Class</th>
            }
            <th>Activity</th>
          </tr>
        </thead>
        <tbody>
          {offlineActivities.map(offlineActivity =>
            <OfflineActivityListRow key={offlineActivity.resourceUrl} activity={offlineActivity}/>
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
