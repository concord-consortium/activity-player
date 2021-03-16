import React from "react";
import { SummaryTable } from "./summary-table";
import { shallow } from "enzyme";

const questionsStatus = [
                          {number: 1, page: 1, prompt: "What is the answer?", answered: true},
                          {number: 2, page: 1, prompt: "What is the question?", answered: true},
                          {number: 3, page: 2, prompt: "Where are we going?", answered: false},
                        ];

describe("Summary Table component", () => {
  it("renders component", () => {
    const wrapperComplete = shallow(
                              <SummaryTable questionsStatus={questionsStatus} />
                            );
    expect(wrapperComplete.find('[data-cy="summary-table"]').length).toBe(1);
    expect(wrapperComplete.find('[data-cy="summary-table-row"]').length).toBe(3);
    expect(wrapperComplete.find('[data-cy="summary-table-row"]').at(0).text()).toContain("Page 1: Question 1. What is the answer?");
    expect(wrapperComplete.find('[data-cy="summary-table-row"]').at(1).text()).toContain("Page 1: Question 2. What is the question?");
    expect(wrapperComplete.find('[data-cy="summary-table-row"]').at(2).text()).toContain("Page 2: Question 3. Where are we going?");
  });
});
