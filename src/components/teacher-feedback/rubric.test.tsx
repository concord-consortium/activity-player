import React from "react";
import { mount, shallow } from "enzyme";
import { RubricComponent } from "./rubric";
import { baseMockFeedback, rubricScoreActivitySettings, mockRubric, mockRubricFeedback, 
  criteriaLabelForStudent, feedbackLabelForStudent, criteriaDescriptionForStudent} from "../../test-utils/rubric";

jest.mock("./rubric-score", () => ({
  RubricScore: () => <div data-testid="mock-rubric-score" />
}));

describe("RubricComponent", () => {
  it("should render nothing if no rubric is provided", () => {
    const wrapper = shallow(
      <RubricComponent teacherFeedback={baseMockFeedback} />
    );
    expect(wrapper.isEmptyRender()).toBe(true);
  });
  it("should render rubric", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: rubricScoreActivitySettings,
        rubric: mockRubric,
      },
      rubricFeedback: mockRubricFeedback
    };
    const wrapper = mount(
      <RubricComponent teacherFeedback={mockFeedback} />
    );
    expect(wrapper.find('[data-testid="rubric"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="rubric"]').find("table").exists()).toBe(true);
    expect(wrapper.find("thead").find("th").at(0).text()).toBe(criteriaLabelForStudent);
    expect(wrapper.find("thead").find("th").at(1).text()).toBe(feedbackLabelForStudent);
    expect(wrapper.find("tbody").find("td").at(0).text()).toContain(criteriaDescriptionForStudent);
    expect(wrapper.find("tbody").find("td").at(1).text()).toContain("DEVELOPING");
  });
});
