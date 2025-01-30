// import { List, Map } from "immutable";
import { Rubric, RubricCriterion } from "../types";
import { RUBRIC_SCORE, NO_SCORE, AUTOMATIC_SCORE, MANUAL_SCORE } from "./scoring-constants";

// the scoring constants are defined in a JavaScript file so we create the sum type here
const scoreTypes = [MANUAL_SCORE, NO_SCORE, RUBRIC_SCORE, AUTOMATIC_SCORE] as const;
export type ScoreType = typeof scoreTypes[number];

export type ScoringSettings = {
  scoreType: ScoreType;
  maxScore: number;
}

interface GetScoringSettingsOptions {
  rubric?: Rubric;
  hasScoredQuestions?: boolean;
}

const maxReducer = (prev: number, current: number) => current > prev ? current : prev;

export const computeRubricMaxScore = (rubric?: Rubric) => {
  if (!rubric) return 0;

  const criteria: RubricCriterion[] = rubric.criteriaGroups.flatMap(group => group.criteria);
  const ratings = rubric.ratings;
  const numCrit = (criteria.length) || 0;
  const maxScore = ratings.map((r, i) => r.score || i).reduce(maxReducer, 0);
  return numCrit * maxScore;
};

// export const getScoringSettingsInState = (state: any, activityId: any) => {
//   return (state.getIn(["feedback", "settings", "activitySettings", activityId]) || Map({})).toJS();
// };

export const getScoringSettings = (initialSettings?: ScoringSettings, options?: GetScoringSettingsOptions): ScoringSettings => {
  const hasRubric = !!options?.rubric;
  const hasScoredQuestions = !!options?.hasScoredQuestions;
  const defaultScoreType = hasRubric ? RUBRIC_SCORE : (hasScoredQuestions ? AUTOMATIC_SCORE : NO_SCORE);

  const settings: ScoringSettings = {
    scoreType: initialSettings?.scoreType ?? defaultScoreType,
    maxScore: initialSettings?.maxScore ?? 10,
  };

  if (settings.scoreType === RUBRIC_SCORE && !hasRubric) {
    settings.scoreType = NO_SCORE;
  }
  if (settings.scoreType === AUTOMATIC_SCORE && !hasScoredQuestions) {
    settings.scoreType = defaultScoreType;
  }

  return settings;
};

// export const getScoredQuestions = (activity: any): List<any> => {
//   return activity.get("questions")?.filter((q: any) =>
//     q.get("visible") && q.get("type") === "multiple_choice" && q.get("scored"),
//   ) ?? List();
// };

// export const computeAvgScore = (scoringSettings: ScoringSettings, rubric: Rubric, feedbacks: any) => {
//   const { scoreType, maxScore } = scoringSettings;
//   let avgScore = 0;
//   let avgScoreMax = 0;

//   switch (scoreType) {
//     case RUBRIC_SCORE:
//       // eslint-disable-next-line no-case-declarations
//       const rubricScores = getCompletedRubricScores(rubric, feedbacks);
//       // eslint-disable-next-line no-case-declarations
//       const {totalScore, scoredQuestions} = rubricScores.reduce((acc, cur) => {
//         // eslint-disable-next-line @typescript-eslint/no-shadow
//         let {totalScore, scoredQuestions} = acc;
//         if (cur) {
//           totalScore += cur;
//           scoredQuestions++;
//         }
//         return {totalScore, scoredQuestions};
//       }, {totalScore: 0, scoredQuestions: 0});

//       if (scoredQuestions > 0) {
//         avgScore = totalScore / scoredQuestions;
//       }
//       avgScoreMax = computeRubricMaxScore(rubric);
//       break;

//     case MANUAL_SCORE:
//       // eslint-disable-next-line no-case-declarations
//       const manualScores = getCurrentScores(feedbacks);
//       if (manualScores.length > 0) {
//         const total = manualScores.reduce((acc: number, cur: number) => acc + cur, 0);
//         avgScore = total / manualScores.length;
//       }
//       avgScoreMax = maxScore;
//       break;
//   }

//   return {avgScore, avgScoreMax};
// };

// export const getCurrentScores = (feedbacks: any) => {
//   return feedbacks.feedbacks.reduce((acc: any, cur: any) => {
//     const score = cur.get("score");
//     if (score !== undefined) {
//       acc.push(score);
//     }
//     return acc;
//   }, []);
// };

export const getNumCriteria = (rubric: Rubric) => {
  return rubric.criteriaGroups.reduce((acc, cur) => {
    return acc + cur.criteria.length;
  }, 0);
};

// export const getCompletedRubricScores = (rubric: Rubric, feedbacks: any) => {
//   let scores: Map<any, any> = Map({});
//   const numCriteria = getNumCriteria(rubric);
//   feedbacks.feedbacks.forEach((feedback: any) => {
//     const key = feedback.get("platformStudentId");
//     const rubricFeedback = feedback.get("rubricFeedback");
//     let score = null;
//     const nonZeroScores = rubricFeedback?.map((v: any, k: any) => v.get("score")).filter((n: number) => n > 0);
//     if (nonZeroScores?.size === numCriteria) {
//       score = nonZeroScores.reduce((p: number, n: number) => p + n);
//       scores.set(key, score);
//     }
//     scores = scores.set(key, score);
//   });
//   return scores;
// };

export const getRubricDisplayScore = (rubric: Rubric, rubricFeedback: any) => {
  let displayScore = "N/A";

  if (rubricFeedback) {
    const scoredValues = Object.values(rubricFeedback).filter((v: any) => v.score > 0);
    if (scoredValues.length === getNumCriteria(rubric)) {
      const totalScore = scoredValues.reduce((acc, cur: any) => acc + cur.score, 0);
      displayScore = String(totalScore);
    }
  }

  return displayScore;
};

// export const hasFeedbackGivenScoreType = (options: {scoreType: ScoreType; textFeedback?: string; scoreFeedback?: number; rubric?: Rubric; rubricFeedback: any }) => {
//   const {scoreType, textFeedback, scoreFeedback, rubric, rubricFeedback } = options;

//   const hasScore = scoreFeedback !== undefined;
//   const hasText = (textFeedback ?? "").length > 0;

//   let hasFilledRubric = false;
//   if (rubric && rubricFeedback) {
//     const scoredValues = Object.values(rubricFeedback).filter((v: any) => v.score > 0);
//     hasFilledRubric = scoredValues.length === getNumCriteria(rubric);
//   }

//   switch (scoreType) {
//     case MANUAL_SCORE:
//       return hasScore;

//     case RUBRIC_SCORE:
//       return hasFilledRubric;

//     default:
//       return hasText || hasFilledRubric;
//   }
// };
