import React from "react";
import { shallow } from "enzyme";
import { SequenceIntroFeedbackBanner } from "./sequence-intro-feedback-banner";

describe("Intro Feedback Banner component", () => {
  it("renders component for a sequence", () => {
    const wrapper = shallow(<SequenceIntroFeedbackBanner />);
    expect(wrapper.find('[data-cy="intro-feedback-banner"]').length).toBe(1);
    expect(wrapper.find('[data-cy="intro-feedback-banner"]').contains("Your teacher has provided feedback."));
  });

  it("hides the decorative feedback icon from assistive technology", () => {
    // The adjacent "Your teacher has provided feedback." text already conveys the meaning,
    // so the icon is decorative and must not be announced.
    const wrapper = shallow(<SequenceIntroFeedbackBanner />);
    const icon = wrapper.find("test-file-stub");
    expect(icon.length).toBe(1);
    expect(icon.prop("aria-hidden")).toBe("true");
    expect(icon.prop("focusable")).toBe("false");
  });
});
