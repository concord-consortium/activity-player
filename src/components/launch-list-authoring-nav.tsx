import React from "react";
import { clearLaunchListAuthoringData, clearLaunchListAuthoringId, getLaunchListAuthoringDownloadJSON } from "../launch-list-api";
import { LaunchList, LaunchListActivity } from "../types";
import queryString from "query-string";

import "./launch-list-authoring-nav.scss";

interface IProps {
  launchList?: LaunchList;
  launchListAuthoringId: string;
  launchListAuthoringActivities: LaunchListActivity[],
  launchListAuthoringCacheList: string[],
}

export class LaunchListAuthoringNav extends React.PureComponent<IProps> {
  render() {
    const { launchList, launchListAuthoringId, launchListAuthoringActivities, launchListAuthoringCacheList } = this.props;

    const handleDownloadClicked = (e: React.MouseEvent<HTMLAnchorElement>) => {
      const json = getLaunchListAuthoringDownloadJSON(
        launchList?.name ?? "Untitled Launch List",
        {activities: launchListAuthoringActivities, cacheList: launchListAuthoringCacheList.slice().sort()}
      );
      const blob = new Blob([ JSON.stringify(json, null, 2) ], { type: "application/json" });
      e.currentTarget.href = URL.createObjectURL(blob);
    };

    const handleClearAuthoringId = () => {
      if (confirm("Exit authoring (clears the launch list authoring id in localstorage)?")) {
        clearLaunchListAuthoringId();
        const query = queryString.parse(window.location.search);
        delete query.setLaunchListAuthoringId;
        window.location.replace(`?${queryString.stringify(query)}`);
      }
    };

    const handleClearAuthoringData = () => {
      if (confirm("Are your SURE you want to clear ALL the saved authoring data?")) {
        clearLaunchListAuthoringData(launchListAuthoringId);
        window.location.reload();
      }
    };

    return (
      <div className="launch-list-authoring-nav" data-cy="launch-list-authoring-nav">
        <div className="inner">
          <div className="nav-center">
            Authoring: &quot;{launchListAuthoringId}&quot; ({launchListAuthoringActivities.length} activities / {launchListAuthoringCacheList.length} cached items)
          </div>
          <div className="nav-right">
            <a href="" download={`${launchListAuthoringId}.json`} onClick={handleDownloadClicked}>Download JSON</a>
            <button onClick={handleClearAuthoringData}>Clear Authoring Data</button>
            <button onClick={handleClearAuthoringId} data-cy="launch-list-exit-authoring-button">Exit Authoring</button>
          </div>
        </div>
      </div>
    );
  }
}
