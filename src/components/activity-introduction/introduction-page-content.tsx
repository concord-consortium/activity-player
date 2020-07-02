import React from "react";
import { SocialMediaLinks } from "../activity-introduction/social-media-links";
import { ActivitySummary } from "../activity-introduction/activity-summary";
import { ActivityPageLinks } from "../activity-introduction/activity-page-links";

import "./introduction-page-content.scss";

interface IProps {
  activity: any;
  onPageChange: (page: number) => void;
}

export const IntroductionPageContent: React.FC<IProps> = (props) => {
  const { activity, onPageChange } = props;
  return (
    <div className="intro-content" data-cy="intro-page-content">
      <SocialMediaLinks shareURL="https://concord.org/" />
      <div className="introduction">
        <ActivitySummary
          activityName={activity.name}
          introText={activity.description}
          time={activity.time_to_complete}
        />
        <ActivityPageLinks
          activityPages={activity.pages}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
};
