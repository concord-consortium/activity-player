import React from "react";
import { NavMenu } from "./nav-menu";
import { shallow } from "enzyme";

describe("Nav Menu component", () => {
  it("renders menu and menu items", () => {
    const wrapper = shallow(<NavMenu activityList={["listitem1", "listitem2"]} />);
    expect(wrapper.containsMatchingElement(<div>Menu</div>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>listitem1</div>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>listitem2</div>)).toEqual(true);
  });
});
