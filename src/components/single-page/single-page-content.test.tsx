import React from "react";
import { SinglePageContent } from "./single-page-content";
import { shallow } from "enzyme";
import { Activity } from "../../types";
import { Embeddable } from "../activity-page/embeddable";
import { DefaultTestActivity } from "../../test-utils/model-for-tests";
import _activitySinglePage from "../../data/version-2/sample-new-sections-single-page-layout.json";

const activitySinglePage = _activitySinglePage as Activity;

describe("Single Page Content component", () => {
  it("renders component", () => {
    const wrapper = shallow(<SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} />);
    expect(wrapper.find('[data-cy="single-page-content"]').length).toBe(1);
  });
  it.skip("renders component content", () => {
    const wrapper = shallow(<SinglePageContent activity={activitySinglePage} pluginsLoaded={true} />);
    expect(wrapper.find('[data-cy="single-page-content"]').length).toBe(1);
    // should render 10 embeddables, there are 11 total, 1 is hidden
    expect(wrapper.find(Embeddable).length).toBe(10);
  });
});
