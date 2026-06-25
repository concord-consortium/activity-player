import React from "react";
import { shallow } from "enzyme";
import { SequenceIntroduction } from "./sequence-introduction";
import { Header } from "../activity-header/header";
import { Footer } from "../activity-introduction/footer";
import { SequencePageContent } from "./sequence-page-content";
import { Sequence } from "../../types";
import _sequence from "../../data/version-2/sample-new-sections-sequence.json";

const sequence = _sequence as Sequence;

describe("Sequence Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SequenceIntroduction sequence={sequence} username="test" onSelectActivity={stubFunction} />);
    expect(wrapper.find(Header).length).toBe(1);
    expect(wrapper.find(Footer).length).toBe(1);
    expect(wrapper.find(SequencePageContent).length).toBe(1);
  });
  it("wraps the sequence content in a focusable main landmark", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SequenceIntroduction sequence={sequence} username="test" onSelectActivity={stubFunction} />);
    const main = wrapper.find("main#main-content");
    expect(main.length).toBe(1);
    expect(main.prop("tabIndex")).toBe(-1);
    expect(main.find(SequencePageContent).length).toBe(1);
  });
  it("renders empty component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SequenceIntroduction sequence={undefined} username="test" onSelectActivity={stubFunction} />);
    expect(wrapper.find('[data-cy="sequence-loading"]').length).toBe(1);
  });
});
