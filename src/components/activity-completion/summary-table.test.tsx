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
});
