import React from "react";
import { ActivityPageLinks } from "./activity-page-links";
import { shallow } from "enzyme";

describe("Activity Page Links component", () => {
  it("renders activity page links", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<ActivityPageLinks activityPages={["1", "2", "3"]} onPageChange={stubFunction} />);
    expect(wrapper.containsMatchingElement(<span>Page 1</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<span>Page 2</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<span>Page 3</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<button>Begin Activity</button>)).toEqual(true);
  });
});
