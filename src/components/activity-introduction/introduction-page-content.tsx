import React, { useEffect, useState } from "react";
import { ActivitySummary } from "../activity-introduction/activity-summary";
import { ActivityPageLinks } from "../activity-introduction/activity-page-links";
import { Activity, ActivityFeedback} from "../../types";
import { IntroPageActivityLevelFeedback } from "../teacher-feedback/intro-page-activity-level-feedback";
import { subscribeToActivityLevelFeedback } from "../../utilities/feedback-utils";

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
    if (activity.id) {
      const unsubscribe = subscribeToActivityLevelFeedback({
        activityId: activity.id,
        isSequence: !!isSequence,
        callback: (fb: ActivityFeedback | null) => setFeedback(fb)
      });

      return () => unsubscribe();
    }
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
          activityId={activity.id}
          activityPages={activity.pages}
          isSequence={isSequence}
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
