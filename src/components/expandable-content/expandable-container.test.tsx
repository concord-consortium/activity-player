import React from "react";
import { ExpandableContainer } from "./expandable-container";
import { shallow } from "enzyme";
import { Activity } from "../../types";
import { SidebarWrapper } from "../page-sidebar/sidebar-wrapper";
import { EmbeddablePluginSideTip } from "../activity-page/plugins/embeddable-plugin-sidetip";
import _activityPlugins from "../../data/sample-activity-plugins.json";

const activityPlugins = _activityPlugins as Activity;

describe("Expandable container component", () => {
  it("renders component", () => {
    const wrapper = shallow(<ExpandableContainer activity={activityPlugins} page={activityPlugins.pages[0]} pageNumber={1} teacherEditionMode={true} />);
    expect(wrapper.find('[data-cy="expandable-container"]').length).toBe(1);
  });
  it("renders component content", () => {
    const wrapper = shallow(<ExpandableContainer activity={activityPlugins} page={activityPlugins.pages[2]} pageNumber={3} teacherEditionMode={true} />);
    expect(wrapper.find('[data-cy="expandable-container"]').length).toBe(1);
    expect(wrapper.find('[data-cy="expandable-container"]').length).toBe(1);
    expect(wrapper.find('[data-cy="expandable-container"]').length).toBe(1);
    expect(wrapper.find(SidebarWrapper).length).toBe(1);
    expect(wrapper.find(EmbeddablePluginSideTip).length).toBe(2);
  });
});
