import React from "react";
import { ActivityPageLinks } from "./activity-page-links";
import { shallow } from "enzyme";
import { DefaultTestPage } from "../../test-utils/model-for-tests";

describe("Activity Page Links component", () => {
  it("renders activity page links", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const activityPages = [
      {...DefaultTestPage, name: "1"},
      {...DefaultTestPage, name: "2"},
      {...DefaultTestPage, name: "3"},
    ];

    const wrapper = shallow(<ActivityPageLinks activityPages={activityPages} onPageChange={stubFunction} />);
    expect(wrapper.containsMatchingElement(<span>Page 1</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<span>Page 2</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<span>Page 3</span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<button>Begin Activity</button>)).toEqual(true);
  });
});
