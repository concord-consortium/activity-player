import React from "react";
import { ActivityNavHeader } from "./activity-nav-header";
import { shallow } from "enzyme";

describe("Activity Nav Header component", () => {
  it("renders nav header content containers", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<ActivityNavHeader activityName="activity name" activityPages={["1", "2", "3"]} currentPage={0} onPageChange={stubFunction} singlePage={false} />);
    expect(wrapper.find('[data-cy="activity-nav-header"]').length).toBe(1);
    expect(wrapper.find('[data-cy="activity-nav-header-left"]').length).toBe(1);
    expect(wrapper.find('[data-cy="activity-nav-header-right"]').length).toBe(1);
  });
});
