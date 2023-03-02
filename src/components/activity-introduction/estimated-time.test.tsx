import React from "react";
import { EstimatedTime } from "./estimated-time";
import { mount } from "enzyme";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

describe("Estimated Time component", () => {
  it("renders estimated time text", () => {
    const estimatedTimeText = "Estimated Time to Complete This Module:10 minutes";
    const wrapper = mount(<DynamicTextTester><EstimatedTime time={10} /></DynamicTextTester>);
    expect(wrapper.text()).toContain(estimatedTimeText);
  });
});
