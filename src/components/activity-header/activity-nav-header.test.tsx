import React from "react";
import { ActivityNavHeader } from "./activity-nav-header";
import { shallow } from "enzyme";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import { NavPages } from "./nav-pages";

describe("Activity Nav Header component", () => {
  it("renders nav header content containers", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const activityPages = [
      {...DefaultTestPage, name: "1"},
      {...DefaultTestPage, name: "2"},
      {...DefaultTestPage, name: "3"},
    ];

    const wrapper = shallow(<ActivityNavHeader activityPages={activityPages} currentPage={0} onPageChange={stubFunction} singlePage={false} />);
    expect(wrapper.containsMatchingElement(<NavPages
      pages={activityPages}
      onPageChange={stubFunction}
      currentPage={0}
    />)).toEqual(true);
  });
});
