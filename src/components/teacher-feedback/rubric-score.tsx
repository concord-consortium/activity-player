import React from "react";
import { ActivityFeedback } from "../../types";
import { computeRubricMaxScore, getRubricDisplayScore, getScoringSettings, ScoringSettings } from "../../utilities/scoring-utils";

import "./rubric-score.scss";

interface IProps {
  teacherFeedback: ActivityFeedback;
}

export const RubricScore = ({teacherFeedback}: IProps) => {
  const rubric = teacherFeedback.feedbackSettings?.rubric;
  const activitySettings = teacherFeedback.feedbackSettings?.activitySettings;
  const rubricFeedback = teacherFeedback.rubricFeedback;
  if (!activitySettings || !rubric || !rubricFeedback) return null;

  const initialScoringSettings = Object.values(activitySettings).find((cur: any) => {
    return cur.maxScore || cur.scoreType;
  }, { maxScore: 0, scoreType: "rubric"}) as ScoringSettings;
  const { maxScore, scoreType } = getScoringSettings(initialScoringSettings, { rubric });
  if (scoreType === "none") return null;

  const displayMaxScore = scoreType === "rubric"
    ? computeRubricMaxScore(rubric)
    : maxScore;
  const overallScore = scoreType === "manual"
    ? teacherFeedback.manualScore ?? 0
    : getRubricDisplayScore(rubric, rubricFeedback);

  if (scoreType === "manual" && overallScore === 0) return null;

  return (
    <div className="overall-score" data-testid="rubric-overall-score">
      <strong>Overall Score:</strong> {overallScore} out of {displayMaxScore}
    </div>
  );
};
