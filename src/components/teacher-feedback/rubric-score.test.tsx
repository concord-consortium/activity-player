import React from "react";
import { render, screen } from "@testing-library/react";
import { DynamicTextContext } from "@concord-consortium/dynamic-text";
import { RubricScore } from "./rubric-score";
import { baseMockFeedback, rubricScoreActivitySettings, mockRubric, mockRubricFeedback,
  manualScoreActivitySettings, noScoreActivitySettings } from "../../test-utils/rubric";
import { ActivityFeedback } from "../../types";

jest.mock("../../firebase-db", () => ({
  getAllAnswers: () => jest.fn()
}));

const mockDynamicTextContextValue = {
  registerComponent: jest.fn(),
  unregisterComponent: jest.fn(),
  selectComponent: jest.fn()
};

const renderComponent = (feedback: ActivityFeedback) => {
  return render(
    <DynamicTextContext.Provider value={mockDynamicTextContextValue}>
      <RubricScore teacherFeedback={feedback} />
    </DynamicTextContext.Provider>
  );
};

describe("Rubric Score component", () => {
  it("renders component with a rubric score", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: rubricScoreActivitySettings,
        rubric: mockRubric,
      },
      rubricFeedback: mockRubricFeedback
    };

    renderComponent(mockFeedback);
    expect(screen.queryByTestId("rubric-overall-score")).not.toBeNull();
    expect(screen.queryByTestId("rubric-overall-score")?.textContent).toBe("Overall Score: 5 out of 10");
  });

  it("renders component with a manual score", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: manualScoreActivitySettings,
        rubric: mockRubric
      },
      manualScore: 50,
      rubricFeedback: mockRubricFeedback
    };

    renderComponent(mockFeedback);
    expect(screen.queryByTestId("rubric-overall-score")).not.toBeNull();
    expect(screen.queryByTestId("rubric-overall-score")?.textContent).toBe("Overall Score: 50 out of 100");
  });

  it("does not render score when score type is 'manual' and no score has been given", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: manualScoreActivitySettings,
        rubric: mockRubric
      },
      rubricFeedback: mockRubricFeedback
    };

    renderComponent(mockFeedback);
    expect(screen.queryByTestId("rubric-overall-score")).toBeNull();
  });

  it("does not render component when score type is 'none'", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: noScoreActivitySettings,
        rubric: mockRubric
      },
      rubricFeedback: mockRubricFeedback
    };

    renderComponent(mockFeedback);
    expect(screen.queryByTestId("rubric-overall-score")).toBeNull();
  });

  it("does not render component when there is no rubric feedback", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: rubricScoreActivitySettings,
        rubric: mockRubric
      },
    };

    renderComponent(mockFeedback);
    expect(screen.queryByTestId("rubric-overall-score")).toBeNull();
  });

  it("does not render component when there is no rubric", () => {
    const mockFeedback = {
      ...baseMockFeedback
    };

    renderComponent(mockFeedback);
    expect(screen.queryByTestId("rubric-overall-score")).toBeNull();
  });
});
