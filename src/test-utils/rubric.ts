export const criteriaDescription = "This is a criteria description";
export const criteriaDescriptionForStudent = `${criteriaDescription} (for student)`;
export const ratingDescription = "This is a rating description";
export const ratingDescriptionForStudent = `${ratingDescription} (for student)`;
export const criteriaLabel = "Your answer should";
export const criteriaLabelForStudent = `${criteriaLabel} (for student)`;
export const feedbackLabel = "Feedback";
export const feedbackLabelForStudent = `${feedbackLabel} (for student)`;

export const baseMockFeedback = {
  activityId: "activity_1",
  content: "Great job!",
  timestamp: "2021-08-10T14:00:00Z"
};

export const rubricScoreActivitySettings = {
  activity_1: {
    scoreType: "rubric",
  },
};

export const manualScoreActivitySettings = {
  activity_1: {
    maxScore: 100,
    scoreType: "manual",
  },
};

export const noScoreActivitySettings = {
  activity_1: {
    scoreType: "none",
  },
};

export const mockRubric = {
  criteriaGroups: [
    {
      criteria: [
        {
          id: "C1",
          description: criteriaDescription,
          descriptionForStudent: criteriaDescriptionForStudent,
          ratingDescriptions: {
            R1: ratingDescription,
          },
          ratingDescriptionsForStudent: {
            R1: ratingDescriptionForStudent,
          },
        },
      ],
    },
  ],
  criteriaLabel,
  criteriaLabelForStudent,
  feedbackLabel,
  feedbackLabelForStudent,
  ratings: [
    {
      id: "R1",
      label: "DEFICIENT",
      score: 1
    },
    {
      id: "R2",
      label: "DEVELOPING",
      score: 5
    },
    {
      id: "R3",
      label: "PROFICIENT",
      score: 10
    }
  ],
};

export const mockRubricFeedback = {
  C1: {
    description: criteriaDescription,
    id: "R2",
    label: "DEVELOPING",
    score: 5
  },
};
