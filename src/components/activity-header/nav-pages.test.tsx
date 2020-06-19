import React from "react";
import { NavPages } from "./nav-pages";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import { shallow } from "enzyme";

describe("Nav Pages component", () => {
  it("renders nav pages content", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<NavPages pages={["1", "2", "3"]} currentPage={0} onPageChange={stubFunction} />);
    expect(wrapper.containsMatchingElement(<IconHome width={18} height={18} fill="white" />)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>1</div>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>2</div>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>3</div>)).toEqual(true);
  });
});
