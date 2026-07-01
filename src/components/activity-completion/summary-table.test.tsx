import React from "react";
import { SummaryTable } from "./summary-table";
import { mount } from "enzyme";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

const questionsStatus = [
                          {number: 1, page: 1, pageId: 101, prompt: "What is the answer?", answered: true},
                          {number: 2, page: 1, pageId: 101, prompt: "What is the question?", answered: true},
                          {number: 3, page: 2, pageId: 102, prompt: "Where are we going?", answered: false},
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

  it("renders the question navigation items as semantic links with page hrefs", () => {
    const wrapper = mount(
      <DynamicTextTester><SummaryTable questionsStatus={questionsStatus} onPageChange={mockOnPageChange} /></DynamicTextTester>
    );
    // The items navigate to a page, so they must be exposed to assistive technology
    // as links (native <a href>) rather than buttons.
    const links = wrapper.find('a[data-testid="question-link"]');
    expect(links.length).toBe(3);
    expect(links.at(0).prop("href")).toContain("page=page_101");
    expect(links.at(2).prop("href")).toContain("page=page_102");
  });

  it("navigates in-app on a plain click while preventing the default anchor navigation", () => {
    mockOnPageChange.mockClear();
    const wrapper = mount(
      <DynamicTextTester><SummaryTable questionsStatus={questionsStatus} onPageChange={mockOnPageChange} /></DynamicTextTester>
    );
    const preventDefault = jest.fn();
    wrapper.find('a[data-testid="question-link"]').at(2).simulate("click", { button: 0, preventDefault });
    expect(preventDefault).toHaveBeenCalled();
    expect(mockOnPageChange).toHaveBeenCalledWith(2, undefined);
  });

  it("lets modified clicks fall through to the browser for open-in-new-tab", () => {
    mockOnPageChange.mockClear();
    const wrapper = mount(
      <DynamicTextTester><SummaryTable questionsStatus={questionsStatus} onPageChange={mockOnPageChange} /></DynamicTextTester>
    );
    const preventDefault = jest.fn();
    wrapper.find('a[data-testid="question-link"]').at(0).simulate("click", { button: 0, metaKey: true, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockOnPageChange).not.toHaveBeenCalled();
  });

  it("lets non-primary (e.g. middle) button clicks fall through to the browser", () => {
    mockOnPageChange.mockClear();
    const wrapper = mount(
      <DynamicTextTester><SummaryTable questionsStatus={questionsStatus} onPageChange={mockOnPageChange} /></DynamicTextTester>
    );
    const preventDefault = jest.fn();
    wrapper.find('a[data-testid="question-link"]').at(0).simulate("click", { button: 1, preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(mockOnPageChange).not.toHaveBeenCalled();
  });

  it("gives the meaningful complete/incomplete status icons accessible names", () => {
    const wrapper = mount(
      <DynamicTextTester><SummaryTable questionsStatus={questionsStatus} onPageChange={mockOnPageChange} /></DynamicTextTester>
    );
    // One status icon per question; these convey answered/unanswered state with no adjacent text,
    // so they must be exposed to assistive technology with a name rather than hidden.
    const icons = wrapper.find("test-file-stub");
    expect(icons.length).toBe(3);
    icons.forEach((icon) => expect(icon.prop("role")).toBe("img"));
    expect(icons.at(0).prop("aria-label")).toBe("Complete");   // answered: true
    expect(icons.at(2).prop("aria-label")).toBe("Incomplete");  // answered: false
  });
});
