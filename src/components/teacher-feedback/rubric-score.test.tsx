import React from "react";
import { shallow } from "enzyme";
import { RubricScore } from "./rubric-score";
import { baseMockFeedback, rubricScoreActivitySettings, mockRubric, mockRubricFeedback,
  manualScoreActivitySettings, noScoreActivitySettings } from "../../test-utils/rubric";

describe("Rubric Score component", () => {
  it("renders component with a rubric score", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: rubricScoreActivitySettings,
        rubric: mockRubric,
      },
      rubricFeedback: mockRubricFeedback
    };

    const wrapper = shallow(<RubricScore teacherFeedback={mockFeedback} />);
    expect(wrapper.find('[data-testid="rubric-overall-score"]').length).toBe(1);
    expect(wrapper.find('[data-testid="rubric-overall-score"]').text()).toBe("Overall Score: 5 out of 10");
  });

  it("renders component with a manual score", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: manualScoreActivitySettings,
        rubric: mockRubric
      },
      manualScore: 50,
      rubricFeedback: mockRubricFeedback
    };

    const wrapper = shallow(<RubricScore teacherFeedback={mockFeedback} />);
    expect(wrapper.find('[data-testid="rubric-overall-score"]').length).toBe(1);
    expect(wrapper.find('[data-testid="rubric-overall-score"]').text()).toBe("Overall Score: 50 out of 100");
  });

  it("renders 'N/A' when score type is 'manual' and no score has been given", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: manualScoreActivitySettings,
        rubric: mockRubric
      },
      rubricFeedback: mockRubricFeedback
    };

    const wrapper = shallow(<RubricScore teacherFeedback={mockFeedback} />);
    expect(wrapper.find('[data-testid="rubric-overall-score"]').length).toBe(1);
    expect(wrapper.find('[data-testid="rubric-overall-score"]').text()).toBe("Overall Score: N/A out of 100");
  });

  it("does not render component when score type is 'none'", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: noScoreActivitySettings,
        rubric: mockRubric
      },
      rubricFeedback: mockRubricFeedback
    };

    const wrapper = shallow(<RubricScore teacherFeedback={mockFeedback} />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it("does not render component when there is no rubric feedback", () => {
    const mockFeedback = {
      ...baseMockFeedback,
      feedbackSettings: {
        activitySettings: rubricScoreActivitySettings,
        rubric: mockRubric
      },
    };

    const wrapper = shallow(<RubricScore teacherFeedback={mockFeedback} />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });

  it("does not render component when there is no rubric", () => {
    const mockFeedback = {
      ...baseMockFeedback
    };

    const wrapper = shallow(<RubricScore teacherFeedback={mockFeedback} />);
    expect(wrapper.isEmptyRender()).toBe(true);
  });
});
