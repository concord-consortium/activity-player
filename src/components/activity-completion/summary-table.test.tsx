import React from "react";
import { SummaryTable } from "./summary-table";
import { mount } from "enzyme";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

const questionsStatus = [
                          {number: 1, page: 1, prompt: "What is the answer?", answered: true},
                          {number: 2, page: 1, prompt: "What is the question?", answered: true},
                          {number: 3, page: 2, prompt: "Where are we going?", answered: false},
                        ];
const mockOnPageChange = jest.fn();

describe("Summary Table component", () => {
  it("renders component", () => {
    const wrapperComplete = mount(
      <DynamicTextTester><SummaryTable questionsStatus={questionsStatus} onPageChange={mockOnPageChange} /></DynamicTextTester>
    );
    expect(wrapperComplete.find('[data-cy="summary-table"]').length).toBe(1);
    expect(wrapperComplete.find('[data-cy="summary-table-row"]').length).toBe(3);
    expect(wrapperComplete.find('[data-testid="question-page-and-number"]').at(0).text()).toContain("Page 1: Question 1.");
    expect(wrapperComplete.find('[data-testid="question-prompt"]').at(0).text()).toContain("What is the answer?");
    expect(wrapperComplete.find('[data-testid="question-page-and-number"]').at(1).text()).toContain("Page 1: Question 2.");
    expect(wrapperComplete.find('[data-testid="question-prompt"]').at(1).text()).toContain("What is the question?");
    expect(wrapperComplete.find('[data-testid="question-page-and-number"]').at(2).text()).toContain("Page 2: Question 3.");
    expect(wrapperComplete.find('[data-testid="question-prompt"]').at(2).text()).toContain("Where are we going?");
  });

  it("gives the meaningful complete/incomplete status icons accessible names", () => {
    const wrapper = mount(
      <DynamicTextTester><SummaryTable questionsStatus={questionsStatus} onPageChange={mockOnPageChange} /></DynamicTextTester>
    );
    // One status icon per question; these convey answered/unanswered state with no adjacent text,
    // so they must be exposed to assistive technology with a name rather than hidden.
    // Select by the role the icons are asserted to expose, rather than the Jest SVG stub tag;
    // matching exactly three confirms all the status icons are exposed as images to the AT.
    const icons = wrapper.find('[role="img"]');
    expect(icons.length).toBe(3);
    // Labelled but not in the tab order: the name is for the AT, the icon is not interactive.
    icons.forEach((icon) => expect(icon.prop("focusable")).toBe("false"));
    expect(icons.at(0).prop("aria-label")).toBe("Complete");   // answered: true
    expect(icons.at(2).prop("aria-label")).toBe("Incomplete");  // answered: false
  });
});
