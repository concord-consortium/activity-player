import React from "react";
import { mount } from "enzyme";
import { ReadAloudToggle } from "./read-aloud-toggle";
import { ReadAloudContext } from "./read-aloud-context";

describe("ReadAloudToggle component", () => {
  it("renders working ReadAloudToggle component", () => {
    const mockSetReadAloud = jest.fn();
    const wrapper = mount(
      <ReadAloudContext.Provider value={{readAloud: true, readAloudDisabled: false, setReadAloud: mockSetReadAloud}}>
        <ReadAloudToggle />
      </ReadAloudContext.Provider>
    );
    expect(wrapper.find('[data-cy="toggle"]').length).toBe(1);
    expect(wrapper.find(".disabled").length).toBe(0);

    expect(wrapper.find(".label").length).toBe(1);
    expect(wrapper.find(".label").text()).toBe("Tap text to listen");

    expect(mockSetReadAloud).not.toBeCalled();
    wrapper.find("input").simulate("change");
    expect(mockSetReadAloud).toBeCalled();
  });

  it("renders disabled ReadAloudToggle component", () => {
    const mockSetReadAloud = jest.fn();
    const wrapper = mount(
      <ReadAloudContext.Provider value={{readAloud: true, readAloudDisabled: true, setReadAloud: mockSetReadAloud}}>
        <ReadAloudToggle />
      </ReadAloudContext.Provider>
    );
    expect(wrapper.find('[data-cy="toggle"]').length).toBe(1);
    expect(wrapper.find(".disabled").length).toBe(1);
  });
});
