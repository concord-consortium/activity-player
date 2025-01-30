import * as React from "react";
import Markdown from "markdown-to-jsx";
import { ActivityFeedback, Rubric, RubricCriteriaGroup } from "../../types";
import { RubricScore } from "./rubric-score";

import "./rubric.scss";

interface IProps {
  teacherFeedback: ActivityFeedback;
}

const getStringValue = (value = "", fallbackValue = ""): string => {
  return value.trim().length > 0 ? value : fallbackValue;
};

export const RubricComponent = ({teacherFeedback}: IProps) => {
  const rubric: Rubric | undefined = teacherFeedback.feedbackSettings?.rubric;
  const rubricFeedback = teacherFeedback.rubricFeedback;
  if (!rubric || !rubricFeedback) return null;


  const hasGroupLabel = rubric?.criteriaGroups?.reduce((acc: boolean, cur: RubricCriteriaGroup) => {
    return !!acc || getStringValue(cur.labelForStudent, cur.label).trim().length > 0;
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
            {rubric?.criteriaGroups?.map((criteriaGroup: Record<string, any>) => {
              return criteriaGroup.criteria.map((criteria: Record<string, any>, index: number) => {
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
      <RubricScore teacherFeedback={teacherFeedback} />
    </>
  );
};
