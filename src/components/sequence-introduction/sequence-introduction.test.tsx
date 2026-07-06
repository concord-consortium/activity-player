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
  it("wraps the sequence content in a focusable skip-link target", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SequenceIntroduction sequence={sequence} username="test" onSelectActivity={stubFunction} />);
    // The target is a plain <div>, not a <main>: SequencePageContent provides
    // the single <main> landmark, so a <main> here would nest landmarks.
    const target = wrapper.find("div#main-content");
    expect(target.length).toBe(1);
    expect(target.prop("tabIndex")).toBe(-1);
    expect(target.find(SequencePageContent).length).toBe(1);
  });
  it("renders empty component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SequenceIntroduction sequence={undefined} username="test" onSelectActivity={stubFunction} />);
    expect(wrapper.find('[data-cy="sequence-loading"]').length).toBe(1);
  });
});
