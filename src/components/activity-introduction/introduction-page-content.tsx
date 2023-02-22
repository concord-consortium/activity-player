import React from "react";
import { ActivitySummary } from "../activity-introduction/activity-summary";
import { ActivityPageLinks } from "../activity-introduction/activity-page-links";

import "./introduction-page-content.scss";
import { Activity } from "../../types";

interface IProps {
  activity: Activity;
  onPageChange: (page: number) => void;
  readAloud?: boolean;
  setReadAloud?: (readAloud: boolean) => void;
  readAloudDisabled?: boolean;
}

export const IntroductionPageContent: React.FC<IProps> = (props) => {
  const { activity, readAloud, readAloudDisabled, setReadAloud, onPageChange } = props;
  return (
    <div className="intro-content" data-cy="intro-page-content">
      <div className="introduction">
        <ActivitySummary
          activityName={activity.name}
          introText={activity.description}
          time={activity.time_to_complete}
          imageUrl={activity.thumbnail_url}
          readAloud={readAloud}
          readAloudDisabled={readAloudDisabled}
          setReadAloud={setReadAloud}
        />
        <ActivityPageLinks
          activityPages={activity.pages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};
