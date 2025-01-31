import React, { useContext, useEffect, useState } from "react";
import { ActivityFeedback } from "../../types";
import { LaraDataContext } from "../lara-data-context";
import { getAllAnswers } from "../../firebase-db";
import { computeRubricMaxScore, getAutoScore, getRubricDisplayScore, getScoredQuestions, getScoringSettings,
  ScoringSettings } from "../../utilities/scoring-utils";
import { AUTOMATIC_SCORE, MANUAL_SCORE, NO_SCORE, RUBRIC_SCORE } from "../../utilities/scoring-constants";

import "./rubric-score.scss";

interface IProps {
  teacherFeedback: ActivityFeedback;
}

export const RubricScore = ({teacherFeedback}: IProps) => {
  const activity = useContext(LaraDataContext)?.activity;
  const rubric = teacherFeedback.feedbackSettings?.rubric;
  const activitySettings = teacherFeedback.feedbackSettings?.activitySettings;
  const rubricFeedback = teacherFeedback.rubricFeedback;
  const [studentAnswers, setStudentAnswers] = useState<any>([]);

  useEffect(() => {
    const getAllStudentAnswers = async () => {
      const answers = await getAllAnswers();
      setStudentAnswers(answers);
    };
    getAllStudentAnswers();
  }, []);

  if (!activitySettings || !rubric || !rubricFeedback) return null;

  const initialScoringSettings = Object.values(activitySettings).find((cur: any) => {
    return cur.maxScore || cur.scoreType;
  }, { maxScore: 0, scoreType: RUBRIC_SCORE}) as ScoringSettings;
  const scoredQuestions = activity ? getScoredQuestions(activity) : [];
  const hasScoredQuestions = scoredQuestions.length > 0;
  const { maxScore, scoreType } = getScoringSettings(initialScoringSettings, { hasScoredQuestions, rubric });
  if (scoreType === NO_SCORE) return null;

  const displayMaxScore = scoreType === RUBRIC_SCORE
    ? computeRubricMaxScore(rubric)
    : scoreType === AUTOMATIC_SCORE
      ? scoredQuestions.length
      : maxScore;
  const overallScore = scoreType === MANUAL_SCORE
    ? teacherFeedback.manualScore ?? "N/A"
    : scoreType === AUTOMATIC_SCORE && activity
      ? getAutoScore(activity, studentAnswers)
      : getRubricDisplayScore(rubric, rubricFeedback);

  return (
    <div className="overall-score" data-testid="rubric-overall-score">
      <strong>Overall Score:</strong> {overallScore} out of {displayMaxScore}
    </div>
  );
};
