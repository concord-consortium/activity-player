import React from "react";
import { shallow } from "enzyme";
import { ActivityLevelFeedbackBanner } from "./activity-level-feedback-banner";

describe("Activity Level Feedback component", () => {
  const mockFeedback = {
    content: "Great job!",
    timestamp: "2021-08-10T14:00:00Z"
  };

  it("renders component", () => {
    const wrapper = shallow(<ActivityLevelFeedbackBanner teacherFeedback={mockFeedback} />);
    expect(wrapper.find('[data-testid="activity-level-feedback-banner"]').length).toBe(1);
    expect(wrapper.find('[data-testid="activity-level-feedback-content"]').length).toBe(1);
    expect(wrapper.find('[data-testid="activity-level-feedback-content"]').find("strong").text()).toBe("Overall Teacher Feedback for This Activity:");
    expect(wrapper.find('[data-testid="activity-level-feedback-content"]').text()).toContain(mockFeedback.content);
  });
});
