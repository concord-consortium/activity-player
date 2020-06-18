import React from "react";
import { EstimatedTime } from "./estimated-time";
import { shallow } from "enzyme";

describe("Estimated Time component", () => {
  it("renders estimated time text", () => {
    const estimatedTimeText = "Estimated Time to Complete This Module:10minutes";
    const wrapper = shallow(<EstimatedTime time={10} />);
    expect(wrapper.text()).toContain(estimatedTimeText);
  });
});
