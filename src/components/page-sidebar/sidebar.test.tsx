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
  it("renders the close control as a semantic button with an accessible name", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={"Did you know?"}
      index={0}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    const closeButton = wrapper.find('button[data-cy="sidebar-close-button"]');
    expect(closeButton.length).toBe(1);
    expect(closeButton.prop("type")).toBe("button");
    expect(closeButton.prop("aria-label")).toBe("Close");
  });
  it("renders the panel title as an h2 heading when present", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={"Did you know?"}
      index={0}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    expect(wrapper.find("h2.sidebar-title").length).toBe(1);
  });
  it("renders no heading element when the sidebar has no title (avoids an empty heading)", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={null}
      index={0}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    expect(wrapper.find("h2").length).toBe(0);
    // The placeholder keeps the data-cy hook so layout/selectors are preserved.
    expect(wrapper.find('[data-cy="sidebar-title"]').length).toBe(1);
  });
});
