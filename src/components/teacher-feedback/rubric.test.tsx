import React from "react";
import { render, screen } from "@testing-library/react";
import { DynamicTextContext } from "@concord-consortium/dynamic-text";
import { RubricComponent } from "./rubric";
import { baseMockFeedback, rubricScoreActivitySettings, mockRubric, mockRubricFeedback, 
  criteriaLabelForStudent, feedbackLabelForStudent, criteriaDescriptionForStudent} from "../../test-utils/rubric";

jest.mock("./rubric-score", () => ({
  RubricScore: () => <div data-testid="mock-rubric-score" />
}));

const mockDynamicTextContextValue = {
  registerComponent: jest.fn(),
  unregisterComponent: jest.fn(),
  selectComponent: jest.fn()
};

describe("RubricComponent", () => {
  it("should render nothing if no rubric is provided", () => {
    render(
      <DynamicTextContext.Provider value={mockDynamicTextContextValue}>
        <RubricComponent teacherFeedback={baseMockFeedback} />
      </DynamicTextContext.Provider>
    );
    expect(screen.queryByTestId("rubric")).toBeNull();
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
    render(
      <DynamicTextContext.Provider value={mockDynamicTextContextValue}>
        <RubricComponent teacherFeedback={mockFeedback} />
      </DynamicTextContext.Provider>
    );
    expect(screen.queryByTestId("rubric")).not.toBeNull();
    expect(screen.queryByTestId("rubric")?.querySelector("table")).not.toBeNull();
    expect(screen.queryByTestId("rubric")?.querySelector("thead")?.querySelectorAll("th")[0].textContent).toBe(criteriaLabelForStudent);
    expect(screen.queryByTestId("rubric")?.querySelector("thead")?.querySelectorAll("th")[1].textContent).toBe(feedbackLabelForStudent);
    expect(screen.queryByTestId("rubric")?.querySelector("tbody")?.querySelectorAll("td")[0].textContent).toContain(criteriaDescriptionForStudent);
    expect(screen.queryByTestId("rubric")?.querySelector("tbody")?.querySelectorAll("td")[1].textContent).toContain("DEVELOPING");
  });
});
