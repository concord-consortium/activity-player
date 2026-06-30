import React from "react";
import { shallow } from "enzyme";
import { SummaryPageQuestionFeedback } from "./summary-page-question-feedback";

describe("SummaryPageQuestionFeedback", () => {
  it("renders component", () => {
    const teacherFeedback = {
      content: "Amazing!",
      questionId: "123",
      timestamp: "2021-08-31T14:00:00Z"
    };
    const wrapper = shallow(<SummaryPageQuestionFeedback teacherFeedback={teacherFeedback} />);
    expect(wrapper.find('[data-testid="summary-page-question-feedback"]').length).toBe(1);
    expect(wrapper.find('[data-testid="summary-page-question-feedback-content"]').text()).toContain("Amazing!");
  });

  it("hides the decorative feedback icon from assistive technology", () => {
    // The adjacent "Teacher Feedback:" label conveys the meaning, so the icon is decorative.
    const teacherFeedback = {
      content: "Amazing!",
      questionId: "123",
      timestamp: "2021-08-31T14:00:00Z"
    };
    const wrapper = shallow(<SummaryPageQuestionFeedback teacherFeedback={teacherFeedback} />);
    const icon = wrapper.find("test-file-stub");
    expect(icon.length).toBe(1);
    expect(icon.prop("aria-hidden")).toBe("true");
    expect(icon.prop("focusable")).toBe("false");
  });
});
