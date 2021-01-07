import React from "react";
import { ActivityNav } from "./activity-nav";
import { shallow } from "enzyme";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import { NavPages } from "./nav-pages";

const stubFunction = () => {
  // do nothing.
};
const activityPages = [
  {...DefaultTestPage, name: "1"},
  {...DefaultTestPage, name: "2"},
  {...DefaultTestPage, name: "3"},
];

describe("Activity Nav Header component", () => {
  it("renders nav header content for activity", () => {
    const wrapper = shallow(<ActivityNav activityPages={activityPages} currentPage={0} onPageChange={stubFunction} singlePage={false} />);
    expect(wrapper.containsMatchingElement(<NavPages
      pages={activityPages}
      onPageChange={stubFunction}
      currentPage={0}
    />)).toEqual(true);
  });
});
