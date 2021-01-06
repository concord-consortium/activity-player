import React from "react";
import { SequenceNav } from "./sequence-nav";
import { shallow } from "enzyme";
import { CustomSelect } from "../custom-select";

const stubFunction = () => {
  // do nothing.
};
const activities = [
  "activity1",
  "activity2",
  "activity3"
];

describe("Sequence Nav Header component", () => {
  it("renders sequence header content", () => {
    const wrapper = shallow(<SequenceNav activities={activities} currentActivity={"activity1"} onActivityChange={stubFunction} />);
    expect(wrapper.find('[data-cy="sequence-nav-header"]').length).toBe(1);
    expect(wrapper.text()).toContain("Activity:");
    expect(wrapper.find(CustomSelect)).toHaveLength(1);
  });
});
