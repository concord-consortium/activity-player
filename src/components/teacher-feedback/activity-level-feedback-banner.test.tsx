import React from "react";
import { render, screen } from "@testing-library/react";
import { DynamicTextContext } from "@concord-consortium/dynamic-text";
import { ActivityLevelFeedbackBanner } from "./activity-level-feedback-banner";
import { ActivityFeedback } from "../../types";

jest.mock("./rubric", () => ({
  RubricComponent: () => <div data-testid="mock-rubric" />
}));

describe("Activity Level Feedback component", () => {

  const mockDynamicTextContextValue = {
    registerComponent: jest.fn(),
    unregisterComponent: jest.fn(),
    selectComponent: jest.fn()
  };

  const mockFeedback = {
    activityId: "activity_1",
    content: "Great job!",
    timestamp: "2021-08-10T14:00:00Z"
  };

  const renderComponent = (feedback: ActivityFeedback) => {
    render(
      <DynamicTextContext.Provider value={mockDynamicTextContextValue}>
        <ActivityLevelFeedbackBanner teacherFeedback={feedback} />
      </DynamicTextContext.Provider>
    );
  };

  it("renders component", () => {
    renderComponent(mockFeedback);
    expect(screen.queryByTestId("activity-level-feedback-banner")).not.toBeNull();
    expect(screen.queryByTestId("activity-level-feedback-content")).not.toBeNull();
    expect(screen.queryByTestId("activity-level-feedback-content")?.querySelector("strong")?.textContent).toBe("Overall Teacher Feedback for This Activity:");
    expect(screen.queryByTestId("activity-level-feedback-content")?.textContent).toContain(mockFeedback.content);
  });
  it("renders component with a rubric", () => {
    const mockFeedbackWithRubric = {
      ...mockFeedback,
      feedbackSettings: {
        rubric: {
          id: 123,
          hideRubricFromStudentsInStudentReport: false
        }
      }
    };
    renderComponent(mockFeedbackWithRubric);
    expect(screen.queryByTestId("mock-rubric")).not.toBeNull();
  });
  it("renders component without a rubric when `hideRubricFromStudentsInStudentReport` is true", () => {
    const mockFeedbackWithHiddenRubric = {
      ...mockFeedback,
      feedbackSettings: {
        rubric: {
          id: 123,
          hideRubricFromStudentsInStudentReport: true
        }
      }
    };
    renderComponent(mockFeedbackWithHiddenRubric);
    expect(screen.queryByTestId("mock-rubric")).toBeNull();
  });
});
