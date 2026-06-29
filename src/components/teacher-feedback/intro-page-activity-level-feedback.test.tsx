import React from "react";
import { shallow } from "enzyme";
import { IntroPageActivityLevelFeedback } from "./intro-page-activity-level-feedback";

describe("Activity Level Feedback component", () => {
  const mockFeedback = {
    activityId: "activity_1",
    content: "Great job!",
    timestamp: "2021-08-10T14:00:00Z"
  };

  it("renders component", () => {
    const wrapper = shallow(<IntroPageActivityLevelFeedback teacherFeedback={mockFeedback} />);
    expect(wrapper.find('[data-testid="intro-page-activity-level-feedback"]').length).toBe(1);
  });

  it("renders the 'Teacher Feedback' label as an h2 (not an h1, to avoid a duplicate page h1)", () => {
    const wrapper = shallow(<IntroPageActivityLevelFeedback teacherFeedback={mockFeedback} />);
    expect(wrapper.find("h2").length).toBe(1);
    expect(wrapper.find("h1").length).toBe(0);
  });
});
