import React from "react";
import $ from "jquery";
(window as any).jQuery = $;
(window as any).$ = $;
import "jquery-ui";
import { App } from "./app";
import { shallow } from "enzyme";
import { Activity } from "../types";
import { ActivityNav } from "./activity-header/activity-nav";
import { Header } from "./activity-header/header";
import { Footer } from "./activity-introduction/footer";
import { GlossaryPlugin } from "../components/activity-page/plugins/glossary-plugin";
import _activitySinglePage from "../data/new-schema/sample-new-sections-single-page-layout.json";
import _activity from "../data/new-schema/sample-new-sections-multiple-layout-types.json";
import _activityWithGlossary from "../data/new-schema/sample-new-sections-glossary-plugin.json";

const activity = _activity as Activity;
const activityWithGlossary = _activityWithGlossary as Activity;
const activitySinglePage = _activitySinglePage as Activity;

describe("App component", () => {
  it("renders component", () => {
    const wrapper = shallow(<App />);
    expect(wrapper.find('[data-cy="app"]').length).toBe(1);
    wrapper.setState({ activity });
    expect(wrapper.find(ActivityNav).length).toBe(2);
    expect(wrapper.find(Header).length).toBe(1);
    expect(wrapper.find(Footer).length).toBe(1);
  });
  it("renders single page activity", () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ activity: activitySinglePage });
    expect(wrapper.find(ActivityNav).length).toBe(0);
    expect(wrapper.find(Header).length).toBe(1);
    expect(wrapper.find(Footer).length).toBe(1);
  });
  it("loads plugin scripts", () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ activity: activityWithGlossary, pluginsLoaded: true });
    expect(wrapper.find(GlossaryPlugin).length).toBe(1);
  });
});
