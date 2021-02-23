import React from "react";
import { clearOfflineManifestAuthoringData, clearOfflineManifestAuthoringId, getOfflineManifestAuthoringDownloadJSON } from "../offline-manifest-api";
import { OfflineManifest, OfflineManifestActivity } from "../types";
import queryString from "query-string";

import "./offline-manifest-authoring-nav.scss";

interface IProps {
  offlineManifest?: OfflineManifest;
  offlineManifestAuthoringId: string;
  offlineManifestAuthoringActivities: OfflineManifestActivity[],
  offlineManifestAuthoringCacheList: string[],
}

export class OfflineManifestAuthoringNav extends React.PureComponent<IProps> {
  render() {
    const { offlineManifest, offlineManifestAuthoringId, offlineManifestAuthoringActivities, offlineManifestAuthoringCacheList } = this.props;

    const handleDownloadClicked = (e: React.MouseEvent<HTMLAnchorElement>) => {
      const json = getOfflineManifestAuthoringDownloadJSON(
        offlineManifest?.name ?? "Untitled Offline Manifest",
        {activities: offlineManifestAuthoringActivities, cacheList: offlineManifestAuthoringCacheList.slice().sort()}
      );
      const blob = new Blob([ JSON.stringify(json, null, 2) ], { type: "application/json" });
      e.currentTarget.href = URL.createObjectURL(blob);
    };

    const handleClearAuthoringId = () => {
      if (confirm("Exit authoring (clears the offline manifest authoring id in localstorage)?")) {
        clearOfflineManifestAuthoringId();
        const query = queryString.parse(window.location.search);
        delete query.setOfflineManifestAuthoringId;
        window.location.replace(`?${queryString.stringify(query)}`);
      }
    };

    const handleClearAuthoringData = () => {
      if (confirm("Are your SURE you want to clear ALL the saved authoring data?")) {
        clearOfflineManifestAuthoringData(offlineManifestAuthoringId);
        window.location.reload();
      }
    };

    return (
      <div className="offline-manifest-authoring-nav" data-cy="offline-manifest-authoring-nav">
        <div className="inner">
          <div className="nav-center">
            Authoring: &quot;{offlineManifestAuthoringId}&quot; ({offlineManifestAuthoringActivities.length} activities / {offlineManifestAuthoringCacheList.length} cached items)
          </div>
          <div className="nav-right">
            <a href="" download={`${offlineManifestAuthoringId}.json`} onClick={handleDownloadClicked}>Download JSON</a>
            <button onClick={handleClearAuthoringData}>Clear Authoring Data</button>
            <button onClick={handleClearAuthoringId} data-cy="offline-manifest-exit-authoring-button">Exit Authoring</button>
          </div>
        </div>
      </div>
    );
  }
}
