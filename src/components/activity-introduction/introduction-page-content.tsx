import React, { useEffect, useState } from "react";
import { ActivitySummary } from "../activity-introduction/activity-summary";
import { ActivityPageLinks } from "../activity-introduction/activity-page-links";
import { Activity, TeacherFeedback } from "../../types";
import { watchActivityLevelFeedback } from "../../firebase-db";
import { ActivityLevelFeedback } from "./activity-level-feedback";

import "./introduction-page-content.scss";

interface IProps {
  activity: Activity;
  isInSequence?: boolean;
  onPageChange: (page: number) => void;
}

export const IntroductionPageContent: React.FC<IProps> = (props) => {
  const { activity, onPageChange, isInSequence } = props;
  const [feedback, setFeedback] = useState<TeacherFeedback | null>(null);

  useEffect(() => {
    if (activity.id) {
      return watchActivityLevelFeedback(activity.id, isInSequence, (fb) => {
        setFeedback(fb);
      });
    }
  }, [activity.id, isInSequence]);

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
      { feedback && <ActivityLevelFeedback teacherFeedback={feedback} /> }
    </div>
  );
};
