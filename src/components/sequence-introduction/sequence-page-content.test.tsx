import React from "react";
import { shallow } from "enzyme";
import { render, screen } from "@testing-library/react";
import { SequencePageContent } from "./sequence-page-content";
import { Sequence } from "../../types";
import _sequence from "../../data/version-2/sample-new-sections-sequence.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

// SequencePageContent subscribes to feedback watchers in effects that the full
// RTL render runs, so stub firebase-db (same approach as nav-pages.test.tsx).
jest.mock("../../firebase-db", () => ({
  watchActivityLevelFeedback: jest.fn(() => jest.fn()),
  watchQuestionLevelFeedback: jest.fn(() => jest.fn()),
}));

const sequence = _sequence as Sequence;

describe("Sequence Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SequencePageContent sequence={sequence} onSelectActivity={stubFunction} />);
    expect(wrapper.find('[data-cy="sequence-page-content"]').length).toBe(1);
  });
  it("exposes a single main landmark", () => {
    const stubFunction = () => {
      // do nothing.
    };
    render(<DynamicTextTester><SequencePageContent sequence={sequence} onSelectActivity={stubFunction} /></DynamicTextTester>);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
