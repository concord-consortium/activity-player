import React from "react";
import { mount } from "enzyme";
import { ReadAloudToggle } from "./read-aloud-toggle";

describe("ReadAloudToggle component", () => {
  it("renders working ReadAloudToggle component", () => {
    const mockChange = jest.fn();
    const wrapper = mount(<ReadAloudToggle
                              isChecked={true}
                              disabled={false}
                              onChange={mockChange}
                            />);
    expect(wrapper.find('[data-cy="toggle"]').length).toBe(1);
    expect(wrapper.find(".disabled").length).toBe(0);

    expect(wrapper.find(".label").length).toBe(1);
    expect(wrapper.find(".label").text()).toBe("Tap text to listen");

    expect(mockChange).not.toBeCalled();
    wrapper.find("input").simulate("change");
    expect(mockChange).toBeCalled();
  });

  it("renders disabled ReadAloudToggle component", () => {
    const mockChange = jest.fn();
    const wrapper = mount(<ReadAloudToggle
                              isChecked={true}
                              disabled={true}
                              onChange={mockChange}
                            />);
    expect(wrapper.find('[data-cy="toggle"]').length).toBe(1);
    expect(wrapper.find(".disabled").length).toBe(1);
  });
});
