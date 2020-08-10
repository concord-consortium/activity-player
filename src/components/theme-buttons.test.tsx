import React from "react";
import { ThemeButtons } from "./theme-buttons";
import { shallow } from "enzyme";
import { setBackground } from "../utilities/activity-utils";

describe("Theme Button component", () => {
  it("renders theme buttons", () => {
    const wrapper = shallow(<ThemeButtons/>);
    expect(wrapper.find('[data-cy="theme-buttons"]').length).toBe(1);

    const tealButton = wrapper.find('[data-cy="theme-button-teal"]');
    tealButton.simulate("click");
    let primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#0592af");

    const orangeButton = wrapper.find('[data-cy="theme-button-orange"]');
    orangeButton.simulate("click");
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#ff8415");

    const cbioButton = wrapper.find('[data-cy="theme-button-cbio"]');
    cbioButton.simulate("click");
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#008fd7");

    const watersButton = wrapper.find('[data-cy="theme-button-waters"]');
    watersButton.simulate("click");
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#007c8B");

    const interactionsButton = wrapper.find('[data-cy="theme-button-interactions"]');
    interactionsButton.simulate("click");
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#414546");
    expect(setBackground).toHaveBeenCalled;
  });
});
