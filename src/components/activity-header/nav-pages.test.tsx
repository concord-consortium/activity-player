import React from "react";
import { NavPages } from "./nav-pages";
import { shallow } from "enzyme";
import { render, screen } from "@testing-library/react";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import IconHome from "../../assets/svg-icons/icon-home.svg";

const stubFunction = () => {
  // do nothing.
};
const activityPages = [
  {...DefaultTestPage, name: "1"},
  {...DefaultTestPage, name: "2"},
  {...DefaultTestPage, name: "3"},
  {...DefaultTestPage, name: "4"},
  {...DefaultTestPage, name: "5"},
  {...DefaultTestPage, name: "6"},
  {...DefaultTestPage, name: "7"},
  {...DefaultTestPage, name: "8"},
  {...DefaultTestPage, name: "9"},
  {...DefaultTestPage, name: "10"},
  {...DefaultTestPage, name: "11"},
  {...DefaultTestPage, name: "12"},
  {...DefaultTestPage, name: "13"},
  {...DefaultTestPage, name: "14"},
  {...DefaultTestPage, name: "15"},
];

jest.mock("../../firebase-db", () => ({
  watchActivityLevelFeedback: jest.fn(),
  watchQuestionLevelFeedback: jest.fn()
}));

describe("Nav Pages component", () => {
  it("renders nav pages content", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={0}
      onPageChange={stubFunction}
    />);
    expect(wrapper.containsMatchingElement(<IconHome width={28} height={28}/>)).toEqual(true);
    expect(wrapper.find('[data-cy="nav-pages-button"]').length).toBe(11);
  });
  it("renders nav pages with disabled buttons", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={5}
      onPageChange={stubFunction}
      lockForwardNav={true}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).hasClass("disabled")).toBe(false); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(4).hasClass("disabled")).toBe(false); // previous page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(5).hasClass("disabled")).toBe(true); // current page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(6).hasClass("disabled")).toBe(true); // next page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).hasClass("disabled")).toBe(true); // subsequent page
  });
  it("renders pagination near start page", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={2}
      onPageChange={stubFunction}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).text()).toContain("1"); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).text()).toContain("2"); // second page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(9).text()).toContain("10"); // second to last page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).text()).toContain("11"); // last page
  });
  it("renders pagination in the middle", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={7}
      onPageChange={stubFunction}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).text()).toContain("2"); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).text()).toContain("3"); // second page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(9).text()).toContain("11"); // second to last page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).text()).toContain("12"); // last page
  });
  it("renders pagination near end page", () => {
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={13}
      onPageChange={stubFunction}
    />);
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).text()).toContain("5"); // first page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(1).text()).toContain("6"); // second page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(9).text()).toContain("14"); // second to last page
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(10).text()).toContain("15"); // last page
  });
  it("blocks navigation after page change is requested", () => {
    const onPageChange = jest.fn();
    const wrapper = shallow(<NavPages
      activityId={1}
      pages={activityPages}
      currentPage={13}
      onPageChange={onPageChange}
    />);

    // Lock nav buttons after one of them has been clicked.
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).hasClass("disabled")).toEqual(false);
    wrapper.find('[data-cy="nav-pages-button"]').at(0).simulate("click");
    wrapper.update();
    expect(onPageChange).toHaveBeenCalled();
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).hasClass("disabled")).toEqual(true);

    // Unlock when new page is set.
    wrapper.setProps({
      currentPage: 1
    });
    expect(wrapper.find('[data-cy="nav-pages-button"]').at(0).hasClass("disabled")).toEqual(false);
  });
  it("renders nav page correctly when page is hidden", () => {
    const activityHiddenPages = [
      {...DefaultTestPage, name: "1"},
      {...DefaultTestPage, name: "2", is_hidden: true},
      {...DefaultTestPage, name: "3", is_hidden: true},
      {...DefaultTestPage, name: "4"},
    ];
    render(
      <NavPages
        activityId={1}
        pages={activityHiddenPages}
        currentPage={0}
        onPageChange={stubFunction}
      />
    );
    // back and forward buttons, home button, 2 page buttons
    expect(screen.getAllByRole("button").length).toBe(5);
  });
});
