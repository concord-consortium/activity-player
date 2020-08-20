import React from "react";
import { SidebarTab } from "./sidebar-tab";
import { SidebarPanel } from "./sidebar-panel";
import { shallow } from "enzyme";

describe("SidebarTab component", () => {
  it("renders tab component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const title = "Did you know?";
    const wrapper = shallow(<SidebarTab
      title={title}
      handleShowSidebarContent={stubFunction}
      index={0}
      sidebarOpen={false} />);
    expect(wrapper.find('[data-cy="sidebar-tab-title"]').text()).toContain(title);
  });
  it("renders panel component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const title = "Did you know?";
    const content = "This is the content of the sidebar.";
    const wrapper = shallow(<SidebarPanel
      title={title}
      index={0}
      content={content}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    expect(wrapper.find('[data-cy="sidebar-title"]').text()).toContain(title);
    expect(wrapper.find('[data-cy="sidebar-content"]').length).toBe(1);
  });
});
