import React from "react";
import { SidebarTab } from "./sidebar-tab";
import { SidebarPanel } from "./sidebar-panel";
import { Sidebar } from "./sidebar";
import { shallow } from "enzyme";

describe("SidebarTab and SidebarPanel components", () => {
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
  it("renders the tab trigger as a semantic button that announces it opens a dialog", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarTab
      title={"Did you know?"}
      handleShowSidebarContent={stubFunction}
      index={0}
      sidebarOpen={false} />);
    const button = wrapper.find('button[data-cy="sidebar-tab"]');
    expect(button.length).toBe(1);
    expect(button.prop("type")).toBe("button");
    expect(button.prop("aria-haspopup")).toBe("dialog");
    expect(button.prop("aria-expanded")).toBe(false);
  });
  it("reflects the open state on the tab trigger's aria-expanded", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarTab
      title={"Did you know?"}
      handleShowSidebarContent={stubFunction}
      index={0}
      sidebarOpen={true} />);
    expect(wrapper.find('button[data-cy="sidebar-tab"]').prop("aria-expanded")).toBe(true);
  });
  it("gives the tab trigger a fallback accessible name when there is no title", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarTab
      title={null}
      handleShowSidebarContent={stubFunction}
      index={0}
      sidebarOpen={false} />);
    expect(wrapper.find('button[data-cy="sidebar-tab"]').prop("aria-label")).toBe("Show sidebar");
  });
  it("uses the visible title as the trigger's accessible name when present (no redundant aria-label)", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarTab
      title={"Did you know?"}
      handleShowSidebarContent={stubFunction}
      index={0}
      sidebarOpen={false} />);
    expect(wrapper.find('button[data-cy="sidebar-tab"]').prop("aria-label")).toBeUndefined();
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
  it("marks the panel as a modal dialog with the supplied id", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={"Did you know?"}
      index={0}
      panelId={"sidebar-panel-0"}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    const panel = wrapper.find('[data-cy="sidebar-panel"]');
    expect(panel.prop("role")).toBe("dialog");
    expect(panel.prop("aria-modal")).toBe(true);
    expect(panel.prop("id")).toBe("sidebar-panel-0");
  });
  it("names the dialog via aria-labelledby pointing at the title heading when a title exists", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={"Did you know?"}
      index={0}
      panelId={"sidebar-panel-0"}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    const panel = wrapper.find('[data-cy="sidebar-panel"]');
    const heading = wrapper.find("h2.sidebar-title");
    const headingId = heading.prop("id");
    expect(headingId).toBeTruthy();
    expect(panel.prop("aria-labelledby")).toBe(headingId);
    expect(panel.prop("aria-label")).toBeUndefined();
  });
  it("makes the title heading programmatically focusable so it can receive initial dialog focus", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={"Did you know?"}
      index={0}
      panelId={"sidebar-panel-0"}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    // tabIndex -1 keeps the heading out of the Tab sequence while still allowing
    // the dialog to move initial focus there programmatically when it opens.
    expect(wrapper.find("h2.sidebar-title").prop("tabIndex")).toBe(-1);
  });
  it("falls back to an aria-label on the dialog when there is no title", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={null}
      index={0}
      panelId={"sidebar-panel-0"}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    const panel = wrapper.find('[data-cy="sidebar-panel"]');
    expect(panel.prop("aria-labelledby")).toBeUndefined();
    expect(panel.prop("aria-label")).toBe("Sidebar");
  });
  it("derives the dialog id and accessible name from index when panelId is omitted", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarPanel
      title={"Did you know?"}
      index={3}
      content={"content"}
      show={true}
      handleCloseSidebarContent={stubFunction} />);
    const panel = wrapper.find('[data-cy="sidebar-panel"]');
    // The dialog id and aria-labelledby must resolve even without an explicit panelId,
    // so the trigger's aria-controls and the dialog's accessible name never break.
    expect(panel.prop("id")).toBe("sidebar-panel-3");
    expect(wrapper.find("h2.sidebar-title").prop("id")).toBe("sidebar-panel-3-title");
    expect(panel.prop("aria-labelledby")).toBe("sidebar-panel-3-title");
  });
});

describe("Sidebar component", () => {
  it("links the trigger to the panel with a shared id (aria-controls)", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<Sidebar
      content={"content"}
      handleShowSidebar={stubFunction}
      index={2}
      show={false}
      title={"Did you know?"} />);
    const tab = wrapper.find(SidebarTab);
    const panel = wrapper.find(SidebarPanel);
    const panelId = panel.prop("panelId");
    expect(panelId).toBeTruthy();
    // Both the trigger and the panel share the same id so aria-controls resolves.
    expect(tab.prop("panelId")).toBe(panelId);
  });
});

describe("SidebarTab dialog linkage", () => {
  it("points aria-controls at the panel it opens", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarTab
      title={"Did you know?"}
      handleShowSidebarContent={stubFunction}
      index={0}
      panelId={"sidebar-panel-0"}
      sidebarOpen={false} />);
    expect(wrapper.find('button[data-cy="sidebar-tab"]').prop("aria-controls")).toBe("sidebar-panel-0");
  });
  it("falls back aria-controls to the index-derived panel id when panelId is omitted", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<SidebarTab
      title={"Did you know?"}
      handleShowSidebarContent={stubFunction}
      index={3}
      sidebarOpen={false} />);
    expect(wrapper.find('button[data-cy="sidebar-tab"]').prop("aria-controls")).toBe("sidebar-panel-3");
  });
});
