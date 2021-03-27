import React from "react";
import { ActivitySummary } from "../activity-introduction/activity-summary";
import { ActivityPageLinks } from "../activity-introduction/activity-page-links";

import "./introduction-page-content.scss";
import { Activity } from "../../types";

interface IProps {
  activity: Activity;
  onPageChange: (page: number) => void;
}

export const IntroductionPageContent: React.FC<IProps> = (props) => {
  const { activity, onPageChange } = props;
  return (
    <div className="intro-content" data-cy="intro-page-content">
      <div className="introduction">
        <ActivitySummary
          activityName={activity.name}
          introText={activity.description}
          time={activity.time_to_complete}
          imageUrl={activity.thumbnail_url}
        />
        <ActivityPageLinks
          activityPages={activity.pages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};
