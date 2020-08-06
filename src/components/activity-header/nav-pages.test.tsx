import React from "react";
import { NavPages } from "./nav-pages";
import IconHome from "../../assets/svg-icons/icon-home.svg";
import { shallow } from "enzyme";
import { DefaultTestPage } from "../../test-utils/model-for-tests";

describe("Nav Pages component", () => {
  it("renders nav pages content", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const activityPages = [
      {...DefaultTestPage, name: "1"},
      {...DefaultTestPage, name: "2"},
      {...DefaultTestPage, name: "3"},
    ];

    const wrapper = shallow(<NavPages pages={activityPages} currentPage={0
    } onPageChange={stubFunction} />);
    expect(wrapper.containsMatchingElement(<IconHome width={28} height={28} fill="white" />)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>1</div>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>2</div>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<div>3</div>)).toEqual(true);
  });
});
