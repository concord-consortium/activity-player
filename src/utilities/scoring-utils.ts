import { WrappedDBAnswer } from "../firebase-db";
import { Activity, EmbeddableType, Page, Rubric, RubricCriterion, SectionType } from "../types";
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

export const getScoredQuestions = (activity: Activity): Array<any> => {
  const questions = activity.pages
    .flatMap((page: Page) => page.sections)
    .flatMap((section: SectionType) => section.embeddables)
    .filter((embeddable: EmbeddableType) => !embeddable.is_hidden && embeddable.type === "ManagedInteractive");

  // Only multiple-choice questions with at least one correct choice are considered scored questions.
  const scoredQuestions = questions.filter((question: Record<string, any>) => {
    if (question.authored_state) {
      const { choices } = JSON.parse(question.authored_state);
        return choices?.some((choice: Record<string, any>) => choice.correct);
    }
    return false;
  });

  return scoredQuestions;
};

export const getNumCriteria = (rubric: Rubric) => {
  return rubric.criteriaGroups.reduce((acc, cur) => {
    return acc + cur.criteria.length;
  }, 0);
};

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

export const getAutoScore = (activity: Activity, answers: WrappedDBAnswer[]) => {
  const scoredQuestions = getScoredQuestions(activity);
  const correctAnswers = scoredQuestions.filter((question: Record<string, any>) => {
    const questionId = refIdToQuestionId(question.ref_id);
    const correctAnswerIds = JSON.parse(question.authored_state).choices
      .filter((choice: Record<string, any>) => choice.correct)
      .map((choice: Record<string, any>) => choice.id);
    const answer = answers.find((a: Record<string, any>) => a.meta.question_id === questionId);
    const selectedChoiceIds = answer?.interactiveState.selectedChoiceIds ?? [];
    return (
      correctAnswerIds.length > 0 &&
      selectedChoiceIds.length === correctAnswerIds.length &&
      correctAnswerIds.every((id: string) => selectedChoiceIds.includes(id))
    );
  }) ?? [];

  return correctAnswers.length;
};

/*
 * Converts an embeddable's refId value to an answer's question_id format.
 * @param {string} refId - The refId of the embeddable
 * @returns {string} The refId converted to a question_id format
 * @example
 * refIdToQuestionId("9463-ManagedInteractive") //=> "managed_interactive_9463"
 */
const refIdToQuestionId = (refId: string) => {
  if (!/^\d+-[A-Za-z]+$/.test(refId)) {
    console.warn(`Unexpected refId format: ${refId}`);
  }

  return refId
    .replace(/([a-z])([A-Z])/g, "$1_$2") // switch camelcase to snakecase
    .replace(/-/g, "_") // replace hyphens with underscores
    .replace(/^(\d+)(.*)/, "$2_$1") // move digits to the end, after added underscore
    .replace(/^_/, "") // remove leading underscore
    .toLowerCase();
};
