import React from "react";
import { PageChangeNotification } from "./page-change-notification";
import { shallow } from "enzyme";

describe("Page Change Notification component", () => {
  it("renders nothing when prop is undefined", () => {
    const wrapper = shallow(<PageChangeNotification pageChangeNotification={undefined} />);
    expect(wrapper.type()).toBe(null);
  });

  it("renders a message when in the started state", () => {
    const wrapper = shallow(<PageChangeNotification pageChangeNotification={{state: "started"}} />);
    expect(wrapper.text()).toBe("Please wait, your work is being saved...");
    expect(wrapper.hasClass("page-change-notification")).toBe(true);
    expect(wrapper.hasClass("page-change-notification-errored")).toBe(false);
  });

  it("renders a message when in the error state", () => {
    const wrapper = shallow(<PageChangeNotification pageChangeNotification={{state: "errored", message: "Test error message!"}} />);
    expect(wrapper.text()).toBe("Test error message!");
    expect(wrapper.hasClass("page-change-notification")).toBe(true);
    expect(wrapper.hasClass("page-change-notification-errored")).toBe(true);
  });
});
