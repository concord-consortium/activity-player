import { DynamicText } from "@concord-consortium/dynamic-text";
import React, { useEffect } from "react";
import { Activity, Sequence } from "../../types";
import { renderHTML } from "../../utilities/render-html";
import { EstimatedTime } from "../activity-introduction/estimated-time";
import { ReadAloudToggle } from "../read-aloud-toggle";
import { ActivityLayoutOverrides } from "../../utilities/activity-utils";
import { watchActivityFeedbackForSequence, watchAllQuestionLevelFeedback } from "../../firebase-db";
import { refIdToAnswersQuestionId } from "../../utilities/embeddable-utils";
import { SequenceIntroFeedbackBanner } from "./sequence-intro-feedback-banner";
import { FeedbackBadge } from "./feedback-badge";

import "./sequence-page-content.scss";

interface IProps {
  sequence: Sequence;
  onSelectActivity: (page: number) => void;
}

export const SequencePageContent: React.FC<IProps> = (props) => {
  const { onSelectActivity, sequence } = props;
  const isNotebookLayout = sequence.layout_override === ActivityLayoutOverrides.Notebook;
  let totalTime = 0;
  let stubCount = 0;
  const [activitiesWithActivityLevelFeedback, setActivitiesWithActivityLevelFeedback] = React.useState<string[]>([]);
  const [activitiesWithQuestionLevelFeedback, setActivitiesWithQuestionLevelFeedback] = React.useState<string[]>([]);

  sequence.activities.forEach((a: Activity) => totalTime += a.time_to_complete || 0);

  useEffect(() => {
    async function watchAllActivityFeedback() {
      return watchActivityFeedbackForSequence((ids: string[]) => setActivitiesWithActivityLevelFeedback(ids));
    }

    async function watchAllQuestionFeedback() {
      return watchAllQuestionLevelFeedback((questionIds: string[]) => {
        const filteredByQuestionFeedback = sequence.activities.filter(a =>
          a.pages.some(p =>
            p.sections.some(s =>
              s.embeddables.some(e => questionIds.includes(refIdToAnswersQuestionId(e.ref_id)))
            )
          )
        ).map(activity => activity.id).filter(Boolean).map(String);
        setActivitiesWithQuestionLevelFeedback(filteredByQuestionFeedback);
      });
    }

    watchAllActivityFeedback();
    watchAllQuestionFeedback();
  }, [sequence.activities]);

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
          <EstimatedTime time={totalTime} />
          {activitiesWithActivityLevelFeedback.length > 0 && <SequenceIntroFeedbackBanner />}
          <div className="thumb-holder">
            {sequence.activities.map((a: Activity, index: number) => {
              if (!a.thumbnail_url) {
                stubCount++;
              }
              const activityHasFeedback = a.id && (activitiesWithActivityLevelFeedback.includes(`${a.id}`) || activitiesWithQuestionLevelFeedback.includes(`${a.id}`));
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
