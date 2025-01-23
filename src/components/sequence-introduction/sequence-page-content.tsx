import { DynamicText } from "@concord-consortium/dynamic-text";
import React, { useEffect } from "react";
import { Activity, ActivityFeedback, QuestionFeedback, Sequence } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { EstimatedTime } from "../activity-introduction/estimated-time";
import { ReadAloudToggle } from "../read-aloud-toggle";
import { ActivityLayoutOverrides } from "../../utilities/activity-utils";
import { watchActivityLevelFeedback, watchQuestionLevelFeedback } from "../../firebase-db";
import { answersQuestionIdToRefId } from "../../utilities/embeddable-utils";
import { SequenceIntroFeedbackBanner } from "../teacher-feedback/sequence-intro-feedback-banner";
import { FeedbackBadge } from "../teacher-feedback/sequence-activity-feedback-badge";

import "./sequence-page-content.scss";

interface IProps {
  sequence: Sequence;
  questionIdsToActivityIdsMap: Record<string, number> | undefined;
  onSelectActivity: (page: number) => void;
}

export const SequencePageContent: React.FC<IProps> = (props) => {
  const { onSelectActivity, questionIdsToActivityIdsMap, sequence } = props;
  const isNotebookLayout = sequence.layout_override === ActivityLayoutOverrides.Notebook;
  let totalTime = 0;
  let stubCount = 0;
  const [activitiesWithActivityLevelFeedback, setActivitiesWithActivityLevelFeedback] = React.useState<string[]>([]);
  const [activitiesWithQuestionLevelFeedback, setActivitiesWithQuestionLevelFeedback] = React.useState<number[]>([]);

  sequence.activities.forEach((a: Activity) => totalTime += a.time_to_complete || 0);

  useEffect(() => {
    const unsubscribe = watchActivityLevelFeedback((fbs: ActivityFeedback[]) => {
      const ids = fbs.map((fb: ActivityFeedback) => fb.activityId.replace("activity_", ""));
      setActivitiesWithActivityLevelFeedback(ids);
    });
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [sequence.activities]);

  useEffect(() => {
    const unsubscribe = watchQuestionLevelFeedback((fbs: QuestionFeedback[]) => {
      const questionIds = fbs.map((fb: QuestionFeedback) => fb.questionId);
      const questionIdsToRefId = questionIds.map(answersQuestionIdToRefId);
      const activityIds: number[] = [];
      questionIdsToRefId.forEach((refId: string) => {
        const activityId = questionIdsToActivityIdsMap?.[refId];
        if (activityId && !activityIds.includes(activityId)) {
          activityIds.push(activityId);
        }
      });

      setActivitiesWithQuestionLevelFeedback(activityIds);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [questionIdsToActivityIdsMap]);

  return (
    <div className="sequence-content" data-cy="sequence-page-content">
      {isNotebookLayout && <div className="notebookHeader" />}
      <div className="introduction">
        <div className="introduction-content">
          <div className="sequence-header">
            <div className="sequence-title">
              <h2><DynamicText>{sequence.display_title || sequence.title || ""}</DynamicText></h2>
            </div>
            <ReadAloudToggle />
          </div>
          <div className="description">{sequence.description && renderHTML(sequence.description)}</div>
          <div className="banners">
            <EstimatedTime time={totalTime} />
            {(activitiesWithActivityLevelFeedback.length > 0 || activitiesWithQuestionLevelFeedback.length > 0) &&
              <SequenceIntroFeedbackBanner />}
          </div>
          <div className="thumb-holder">
            {sequence.activities.map((a: Activity, index: number) => {
              if (!a.thumbnail_url) {
                stubCount++;
              }
              const activityHasFeedback = a.id && (activitiesWithActivityLevelFeedback.includes(`${a.id}`) || activitiesWithQuestionLevelFeedback.includes(a.id));
              return (
              <div className="thumb" key={`activity-${index}`} onClick={() => onSelectActivity(index)} data-cy="sequence-thumb">
                {activityHasFeedback && <FeedbackBadge />}
                <div className="name">
                  <div className="num">{`${index + 1}.`}</div>
                  <div>{a.name}</div>
                </div>
                {a.thumbnail_url ? <img src={a.thumbnail_url} /> : <div className={`image-stub color-${(stubCount - 1) % 5 + 1}`} />}
              </div>
              );})
            }
          </div>
        </div>
      </div>
    </div>
  );
};
