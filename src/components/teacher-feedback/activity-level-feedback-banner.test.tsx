import React from "react";
import { render, screen } from "@testing-library/react";
import { DynamicTextContext } from "@concord-consortium/dynamic-text";
import { ActivityLevelFeedbackBanner } from "./activity-level-feedback-banner";

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

  it("renders component", () => {
    render(
      <DynamicTextContext.Provider value={mockDynamicTextContextValue}>
        <ActivityLevelFeedbackBanner teacherFeedback={mockFeedback} />
      </DynamicTextContext.Provider>
    );
    expect(screen.queryByTestId("activity-level-feedback-banner")).not.toBeNull();
    expect(screen.queryByTestId("activity-level-feedback-content")).not.toBeNull();
    expect(screen.queryByTestId("activity-level-feedback-content")?.querySelector("strong")?.textContent).toBe("Overall Teacher Feedback for This Activity:");
    expect(screen.queryByTestId("activity-level-feedback-content")?.textContent).toContain(mockFeedback.content);
  });
});
