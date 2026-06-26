import React from "react";
import { AccountOwner } from "./account-owner";
import { mount } from "enzyme";

describe("AccountOwner component", () => {
  it("renders the user name", () => {
    const wrapper = mount(<AccountOwner userName="Jan Doe" />);
    expect(wrapper.text()).toContain("Jan Doe");
  });

  it("marks the decorative profile icon as hidden from assistive technology", () => {
    const wrapper = mount(<AccountOwner userName="Jan Doe" />);
    const icon = wrapper.find("test-file-stub");
    expect(icon.length).toBe(1);
    expect(icon.prop("aria-hidden")).toBe("true");
  });
});
