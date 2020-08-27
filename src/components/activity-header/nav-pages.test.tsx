import React from "react";
import { NavPages } from "./nav-pages";
import { shallow } from "enzyme";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
// import  PaginationBoxView  from "react-paginate";
// import ReactPaginate from "react-paginate";
import IconHome from "../../assets/svg-icons/icon-home.svg";



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
    console.log(wrapper.debug());
    expect(wrapper.containsMatchingElement(<IconHome width={28} height={28}/>)).toEqual(true);
  });
});
