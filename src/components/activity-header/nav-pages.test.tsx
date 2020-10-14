import React from "react";
import { NavPages } from "./nav-pages";
import { shallow } from "enzyme";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import IconHome from "../../assets/svg-icons/icon-home.svg";

const stubFunction = () => {
  // do nothing.
};
const activityPages = [
  {...DefaultTestPage, name: "1"},
  {...DefaultTestPage, name: "2"},
  {...DefaultTestPage, name: "3"},
];

describe("Nav Pages component", () => {
  it("renders nav pages content", () => {
    const wrapper = shallow(<NavPages
      pages={activityPages}
      currentPage={0}
      onPageChange={stubFunction}
    />);
    expect(wrapper.containsMatchingElement(<IconHome width={28} height={28}/>)).toEqual(true);
    expect(wrapper.find('[data-cy="nav-pages-button"]').length).toBe(3);
  });
  it("renders nav pages with disabled buttons", () => {
    const wrapper = shallow(<NavPages
      pages={activityPages}
      currentPage={1}
      onPageChange={stubFunction}
      lockForwardNav={true}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).hasClass("disabled")).toBe(false);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).hasClass("disabled")).toBe(true);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(2).hasClass("disabled")).toBe(true);
  });
});
