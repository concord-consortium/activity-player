import React, { useEffect, useState } from "react";
import { ActivitySummary } from "../activity-introduction/activity-summary";
import { ActivityPageLinks } from "../activity-introduction/activity-page-links";
import { Activity, ActivityFeedback } from "../../types";
import { watchActivityLevelFeedback } from "../../firebase-db";
import { IntroPageActivityLevelFeedback } from "../teacher-feedback/intro-page-activity-level-feedback";

import "./introduction-page-content.scss";

interface IProps {
  activity: Activity;
  isSequence?: boolean;
  onPageChange: (page: number) => void;
}

export const IntroductionPageContent: React.FC<IProps> = (props) => {
  const { activity, isSequence, onPageChange } = props;
  const hasCompletionPage = activity.pages.find(p => p.is_completion);
  const [feedback, setFeedback] = useState<ActivityFeedback | null>(null);

  useEffect(() => {
    const unsubscribe = watchActivityLevelFeedback(fbs => {
      if (fbs?.length) {
        const activityIdString = isSequence ? `activity_${activity.id}` : `activity-activity_${activity.id}`;
        const fb = fbs.filter(f => f.activityId === activityIdString);
        fb.length && setFeedback(fb[0]);
      }
    });

    return () => unsubscribe();
  }, [activity.id, isSequence]);

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
      {
        feedback && !hasCompletionPage && (
          <IntroPageActivityLevelFeedback teacherFeedback={feedback} />
        )
      }
    </div>
  );
};
