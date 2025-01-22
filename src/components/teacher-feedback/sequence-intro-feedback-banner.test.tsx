import React from "react";
import { shallow } from "enzyme";
import { SequenceIntroFeedbackBanner } from "./sequence-intro-feedback-banner";

describe("Intro Feedback Banner component", () => {
  it("renders component for a sequence", () => {
    const wrapper = shallow(<SequenceIntroFeedbackBanner />);
    expect(wrapper.find('[data-cy="intro-feedback-banner"]').length).toBe(1);
    expect(wrapper.find('[data-cy="intro-feedback-banner"]').contains("Your teacher has provided feedback."));
  });
});
