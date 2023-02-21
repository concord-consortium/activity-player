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
import { EmbeddablePlugin } from "../components/activity-page/plugins/embeddable-plugin";
import _activitySinglePage from "../data/version-2/sample-new-sections-single-page-layout.json";
import _activity from "../data/version-2/sample-new-sections-multiple-layout-types.json";
import _activityWithGlossary from "../data/version-2/sample-new-sections-glossary-plugin.json";
import _activityOnIpad from "../data/version-2/sample-new-sections-ipad-friendly.json";

// monkeypatch crypto to fix issue with uuid in interactive-api-host reporting getRandomValues not available
(global as any).crypto = {
  getRandomValues: (array: any[]) => {
    let l = array.length;
    while (l--) {
      array[l] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

const activity = _activity as Activity;
const activityWithGlossary = _activityWithGlossary as Activity;
const activitySinglePage = _activitySinglePage as Activity;
const activityOnIpad = _activityOnIpad as Activity;

describe("App component", () => {
  it("renders component", () => {
    const wrapper = shallow(<App />);
    expect(wrapper.find('[data-cy="app"]').length).toBe(1);
    wrapper.setState({ activity });
    expect(wrapper.find(ActivityNav).length).toBe(2);
    expect(wrapper.find(Header).length).toBe(1);
    expect(wrapper.find(Footer).length).toBe(1);
  });
  it("renders single page activity at the default fixed width", () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ activity: activitySinglePage });
    expect(wrapper.find(ActivityNav).length).toBe(0);
    expect(wrapper.find(Header).length).toBe(1);
    expect(wrapper.find(Footer).length).toBe(1);
    expect(wrapper.find(".activity").length).toBe(1);
    expect(wrapper.find(".fixed-width-1100px").length).toBe(1);
    expect(wrapper.find(".fixed-width-ipad-friendly").length).toBe(0);
  });
  it("renders an ipad activity at the ipad friendly fixed width", () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ activity: activityOnIpad });
    expect(wrapper.find(".fixed-width-1100px").length).toBe(0);
    expect(wrapper.find(".fixed-width-ipad-friendly").length).toBe(1);
  });
  it("loads plugin scripts", () => {
    const wrapper = shallow(<App />);
    wrapper.setState({ activity: activityWithGlossary, pluginsLoaded: true });
    expect(wrapper.find(EmbeddablePlugin).length).toBe(1);
  });
});
