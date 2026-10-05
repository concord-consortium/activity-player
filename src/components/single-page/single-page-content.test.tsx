import React from "react";
import { SinglePageContent } from "./single-page-content";
import { shallow } from "enzyme";
import { render, screen } from "@testing-library/react";
import { Activity } from "../../types";
import { DefaultTestActivity } from "../../test-utils/model-for-tests";
import _activitySinglePage from "../../data/version-2/sample-new-sections-single-page-layout.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";
import { EmbeddableVisibilityTracker } from "../../utilities/embeddable-visibility-tracker";

const activitySinglePage = _activitySinglePage as Activity;

describe("Single Page Content component", () => {
  it("renders component", () => {
    const wrapper = shallow(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    expect(wrapper.html()).toContain('data-cy="single-page-content"');
  });
  it("renders component content", () => {
    const wrapper = shallow(<DynamicTextTester><SinglePageContent activity={activitySinglePage} pluginsLoaded={true} /></DynamicTextTester>);
    expect(wrapper.html()).toContain('data-cy="single-page-content"');
    expect(wrapper.html().split('<div class="section').length).toBe(7); // 6 sections = 7 split parts
  });
  it("tracks embeddable visibility while mounted", () => {
    const start = jest.spyOn(EmbeddableVisibilityTracker.prototype, "start");
    const dispose = jest.spyOn(EmbeddableVisibilityTracker.prototype, "dispose");
    const { unmount } = render(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    expect(start).toHaveBeenCalledTimes(1);
    expect(dispose).not.toHaveBeenCalled();
    unmount();
    expect(dispose).toHaveBeenCalledTimes(1);
    start.mockRestore();
    dispose.mockRestore();
  });
  it("exposes a single main landmark", () => {
    render(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
  it("renders the activity name as the page h1", () => {
    render(<DynamicTextTester><SinglePageContent activity={DefaultTestActivity} pluginsLoaded={true} /></DynamicTextTester>);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("name");
  });
});
