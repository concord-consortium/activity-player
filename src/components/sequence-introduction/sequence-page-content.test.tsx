import React from "react";
import { shallow } from "enzyme";
import { SequencePageContent } from "./sequence-page-content";
import { Sequence } from "../../types";
import _sequence from "../../data/sample-sequence.json";

const sequence = _sequence as Sequence;

describe("Sequence Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SequencePageContent sequence={sequence} onSelectActivity={stubFunction} />);
    expect(wrapper.find('[data-cy="sequence-page-content"]').length).toBe(1);
  });
});
