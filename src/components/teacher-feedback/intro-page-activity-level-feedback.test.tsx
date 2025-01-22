import React from "react";
import { shallow } from "enzyme";
import { IntroPageActivityLevelFeedback } from "./intro-page-activity-level-feedback";

describe("Activity Level Feedback component", () => {
  const mockFeedback = {
    content: "Great job!",
    timestamp: "2021-08-10T14:00:00Z"
  };

  it("renders component", () => {
    const wrapper = shallow(<IntroPageActivityLevelFeedback teacherFeedback={mockFeedback} />);
    expect(wrapper.find('[data-testid="intro-page-activity-level-feedback"]').length).toBe(1);
  });
});
