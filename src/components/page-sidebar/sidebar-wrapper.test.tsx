import React from "react";
import { SidebarWrapper, SidebarConfiguration } from "./sidebar-wrapper";
import { Sidebar } from "./sidebar";
import { shallow } from "enzyme";

describe("Sidebar Container component", () => {
  it("renders container component", () => {
    const sidebars: SidebarConfiguration[] = [{content: "sidebar", title: "sidebar1"}, {content: "sidebar", title: "sidebar2"}];
    const wrapper = shallow(<SidebarWrapper sidebars={sidebars} verticalOffset={200} />);
    expect(wrapper.find(Sidebar).length).toBe(2);
  });
});
