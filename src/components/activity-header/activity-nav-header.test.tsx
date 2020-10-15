import React from "react";
import { ActivityNavHeader } from "./activity-nav-header";
import { shallow } from "enzyme";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import { NavPages } from "./nav-pages";
import IconChevronLeft from "../../assets/svg-icons/icon-chevron-left.svg";

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
    const wrapper = shallow(<ActivityNavHeader activityPages={activityPages} currentPage={0} onPageChange={stubFunction} singlePage={false} />);
    expect(wrapper.containsMatchingElement(<NavPages
      pages={activityPages}
      onPageChange={stubFunction}
      currentPage={0}
    />)).toEqual(true);
  });
  it("renders nav header content for sequence", () => {
    const wrapper = shallow(<ActivityNavHeader
                              activityPages={activityPages}
                              currentPage={0}
                              onPageChange={stubFunction}
                              singlePage={false}
                              sequenceName={"test sequence"}
                              onShowSequence={stubFunction}
                              />);
    expect(wrapper.find('[data-cy="activity-nav-header-sequence-name"]').text()).toContain("test sequence");
    expect(wrapper.containsMatchingElement(<IconChevronLeft width={32} height={32}/>)).toEqual(true);
  });
});
