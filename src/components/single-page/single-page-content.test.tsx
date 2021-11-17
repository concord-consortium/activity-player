import React from "react";
import { SinglePageContent } from "./single-page-content";
import { shallow } from "enzyme";
import { Activity } from "../../types";
import { Section } from "../activity-page/section";
import { DefaultTestActivity } from "../../test-utils/model-for-tests";
import _activitySinglePage from "../../data/version-2/sample-new-sections-single-page-layout.json";

const activitySinglePage = _activitySinglePage as Activity;

describe("Single Page Content component", () => {
  it("renders component", () => {
    const wrapper = shallow(<SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} />);
    expect(wrapper.find('[data-cy="single-page-content"]').length).toBe(1);
  });
  it("renders component content", () => {
    const wrapper = shallow(<SinglePageContent activity={activitySinglePage} pluginsLoaded={true} />);
    expect(wrapper.find('[data-cy="single-page-content"]').length).toBe(1);
    expect(wrapper.find(Section).length).toBe(6);
  });
});
