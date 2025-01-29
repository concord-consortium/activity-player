import * as React from "react";
import Markdown from "markdown-to-jsx";
// import { useRubric } from "../../hooks/use-rubric";
import { ActivityFeedback } from "../../types";

import "./rubric.scss";

interface IProps {
  scored: boolean;
  // scoring: Record<string, string>;
  teacherFeedback: ActivityFeedback;
}

const getStringValue = (value = "", fallbackValue = ""): string => {
  return value.trim().length > 0 ? value : fallbackValue;
};

const sumScores = (rubricFeedback: Record<string, any>) => {
  return Object.values(rubricFeedback).reduce((acc, cur) => {
    return acc + cur.score;
  }, 0);
};

export const Rubric = ({scored, teacherFeedback}: IProps) => {
  // const { rubric } = useRubric();
  const rubric = teacherFeedback.rubric;
  const rubricFeedback = teacherFeedback.rubricFeedback;
  const overallScore = sumScores(rubricFeedback);

  if (!scored) {
    return <div></div>;
  }

  const hasGroupLabel = rubric?.criteriaGroups?.reduce((acc: any, cur: any) => {
    return acc || getStringValue(cur.labelForStudent, cur.label).trim().length > 0;
  }, false);
  const criteriaLabel = getStringValue(rubric?.criteriaLabelForStudent, rubric?.criteriaLabel);

  return (
    <>
      <div className="rubric" data-testid="rubric">
        <table>
          <thead>
            <tr>
              <th colSpan={hasGroupLabel ? 2 : 1}>
                { criteriaLabel }
              </th>
              <th>
                { rubric?.feedbackLabelForStudent }
              </th>
            </tr>
          </thead>
          <tbody>
            {rubric?.criteriaGroups?.map((criteriaGroup: any, gIndex: number) => {
              return criteriaGroup.criteria.map((criteria: any, index: any) => {
                const showLabel = index === 0 && hasGroupLabel;
                
                const ratingId = rubricFeedback[criteria.id].id;
                const label = getStringValue(
                  criteriaGroup.labelForStudent,
                  criteriaGroup.label
                );
                const description = getStringValue(
                  criteria.descriptionForStudent,
                  criteria.description
                );
                const ratingDescription = getStringValue(
                  criteria.ratingDescriptionsForStudent[ratingId],
                  criteria.ratingDescriptions[ratingId]
                );
                const rating = rubric?.ratings.find((r: any) => r.id === ratingId);
                const ratingLabel = rating?.label.toUpperCase() ?? "";

                return (
                  <tr key={criteria.id}>
                    {showLabel &&
                      <td
                        rowSpan={criteriaGroup.criteria.length}
                        className="groupLabel">
                        {label}
                      </td>
                    }
                    <td>
                      <div>
                        {criteria.iconUrl && <img src={criteria.iconUrl} title={criteria.iconPhrase} />}
                        <Markdown>{description}</Markdown>
                      </div>
                    </td>
                    <td>
                      { rubric?.showRatingDescriptions
                          ? `${ratingLabel} – ${ratingDescription}`
                          : ratingLabel
                      }
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>
      <div className="feedback-text" data-testid="rubric-feedback-text">
        {teacherFeedback.content}
      </div>
      <div className="overall-score" data-testid="rubric-overall-score">
        <strong>Overall Score:</strong> {overallScore} out of ???
      </div>
    </>
  );
};
