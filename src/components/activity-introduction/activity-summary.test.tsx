import React from "react";
import { ActivitySummary } from "./activity-summary";
import { mount } from "enzyme";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

describe("Activity Summary component", () => {
  it("renders activity intro text", () => {
    const nameText = "activity name text";
    const summaryText = "activity summary text";
    const wrapper = mount(<DynamicTextTester><ActivitySummary activityName={nameText} introText={summaryText} time={10} imageUrl={null} /></DynamicTextTester>);
    expect(wrapper.containsMatchingElement(<div>{nameText}</div>)).toEqual(true);
  });
});
