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
});
