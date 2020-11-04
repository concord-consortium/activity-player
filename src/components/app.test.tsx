import React from "react";
import { App } from "./app";
import { shallow } from "enzyme";
import { Activity } from "../types";
import { ActivityNavHeader } from "../components/activity-header/activity-nav-header";
import { Header } from "./activity-header/header";
import { Footer } from "./activity-introduction/footer";
import _activitySinglePage from "../data/sample-activity-single-page-layout.json";
import _activity from "../data/sample-activity-multiple-layout-types.json";

const activity = _activity as Activity;
const activitySinglePage = _activitySinglePage as Activity;

describe("App component", () => {
  it("renders component", () => {
    const wrapper = shallow(<App />);
    expect(wrapper.find('[data-cy="app"]').length).toBe(1);
    wrapper.setState({ activity });
    expect(wrapper.find(ActivityNavHeader).length).toBe(1);
    expect(wrapper.find(Header).length).toBe(1);
    expect(wrapper.find(Footer).length).toBe(1);
  });
  it("renders single page activity", () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ activity: activitySinglePage });
    expect(wrapper.find(ActivityNavHeader).length).toBe(0);
    expect(wrapper.find(Header).length).toBe(1);
    expect(wrapper.find(Footer).length).toBe(1);
  });
});