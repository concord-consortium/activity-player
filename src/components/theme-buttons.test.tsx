import React from "react";
import { ThemeButtons } from "./theme-buttons";
import { shallow } from "enzyme";

describe("Theme Button component", () => {
  it("renders theme buttons", () => {
    const wrapper = shallow(<ThemeButtons/>);
    expect(wrapper.find('[data-cy="theme-buttons"]').length).toBe(1);

    const tealButton = wrapper.find('[data-cy="theme-button-teal"]');
    tealButton.simulate("click", { target: { dataset: { id: "teal" } } });
    let primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#0592af");

    const orangeButton = wrapper.find('[data-cy="theme-button-orange"]');
    orangeButton.simulate("click", { target: { dataset: { id: "orange" } } });
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#ff8415");

    const cbioButton = wrapper.find('[data-cy="theme-button-cbio"]');
    cbioButton.simulate("click", { target: { dataset: { id: "cbio" } } });
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#008fd7");

    const watersButton = wrapper.find('[data-cy="theme-button-waters"]');
    watersButton.simulate("click", { target: { dataset: { id: "waters" } } });
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#007c8B");

    const interactionsButton = wrapper.find('[data-cy="theme-button-interactions"]');
    interactionsButton.simulate("click", { target: { dataset: { id: "interactions" } } });
    primary = document.documentElement.style.getPropertyValue("--theme-primary-color");
    expect(primary).toBe("#414546");
    // expect(setAppBackgroundImage).toHaveBeenCalled();

    const imageButton = wrapper.find('[data-cy="theme-button-image"]');
    imageButton.simulate("click", { target: { dataset: { id: "image" } } });
    // expect(setAppBackgroundImage).toHaveBeenCalled();
  });
});
