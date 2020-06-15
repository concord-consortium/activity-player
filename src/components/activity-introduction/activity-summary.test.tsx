import React from "react";
import { ActivitySummary } from "./activity-summary";
import { shallow } from "enzyme";

describe("Activity Summary component", () => {
  it("renders activity intro text", () => {
    const nameText = "activity name text";
    const summaryText = "activity summary text";
    const wrapper = shallow(<ActivitySummary activityName={nameText} introText={summaryText} time={10} />);
    expect(wrapper.containsMatchingElement(<h2>{nameText}</h2>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div className="content" dangerouslySetInnerHTML={{__html: summaryText}} />)).toEqual(true);
  });
});
