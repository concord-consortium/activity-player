import React from "react";
import { SinglePageContent } from "./single-page-content";
import { shallow } from "enzyme";
import { Activity } from "../../types";
import { DefaultTestActivity } from "../../test-utils/model-for-tests";
import _activitySinglePage from "../../data/version-2/sample-new-sections-single-page-layout.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

const activitySinglePage = _activitySinglePage as Activity;

describe("Single Page Content component", () => {
  it("renders component", () => {
    const wrapper = shallow(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    expect(wrapper.html()).toContain('data-cy="single-page-content"');
  });
  it("renders component content", () => {
    const wrapper = shallow(<DynamicTextTester><SinglePageContent activity={activitySinglePage} pluginsLoaded={true} /></DynamicTextTester>);
    console.log("wrapper", wrapper.html());
    expect(wrapper.html()).toContain('data-cy="single-page-content"');
    expect(wrapper.html().split('<div class="section').length).toBe(7); // 6 sections = 7 split parts
  });
});
