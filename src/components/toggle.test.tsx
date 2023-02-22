import React from "react";
import { shallow, mount } from "enzyme";
import { Toggle } from "./toggle";

describe("Toggle component", () => {
  it("renders working Toggle component", () => {
    const mockChange = jest.fn();
    const wrapper = mount(<Toggle
                              id="test"
                              label="Toggle Test"
                              isChecked={true}
                              disabled={false}
                              onChange={mockChange}
                            />);
    expect(wrapper.find('[data-cy="toggle"]').length).toBe(1);
    expect(wrapper.find(".disabled").length).toBe(0);

    expect(wrapper.find(".label").length).toBe(1);
    expect(wrapper.find(".label").text()).toBe("Toggle Test");

    expect(mockChange).not.toBeCalled();
    wrapper.find("input").simulate("change");
    expect(mockChange).toBeCalled();
  });

  it("renders disabled Toggle component", () => {
    const mockChange = jest.fn();
    const wrapper = shallow(<Toggle
                              id="test"
                              label="Toggle Test"
                              isChecked={true}
                              disabled={true}
                              onChange={mockChange}
                            />);
    expect(wrapper.find('[data-cy="toggle"]').length).toBe(1);
    expect(wrapper.find(".disabled").length).toBe(1);
  });
});
