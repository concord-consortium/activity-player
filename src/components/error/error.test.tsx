import React from "react";
import { Error, errorMsg } from "./error";
import { shallow } from "enzyme";

describe("Error component", () => {
  it("renders authentication error message without exit link", () => {
    const wrapper = shallow(<Error type="auth" />);
    expect(wrapper.find('[data-cy="error"]').length).toBe(1);
    expect(wrapper.text()).toContain(errorMsg.auth);
    expect(wrapper.find('[data-cy="login-again"]').length).toBe(0);
  });
  
  it("renders network error message", () => {
    const wrapper = shallow(<Error type="network" onExit={jest.fn()}/>);
    expect(wrapper.find('[data-cy="error"]').length).toBe(1);
    expect(wrapper.text()).toContain(errorMsg.network);
  });
  
  it("renders session timeout error message", () => {
    const wrapper = shallow(<Error type="timeout" onExit={jest.fn()}/>);
    expect(wrapper.find('[data-cy="error"]').length).toBe(1);
    expect(wrapper.text()).toContain(errorMsg.timeout);
  });

  it("calls onExit when user clicks the exit link", () => {
    const onExit = jest.fn();
    const wrapper = shallow(<Error type="timeout" onExit={onExit} />);
    expect(wrapper.find('[data-cy="error"]').length).toBe(1);
    wrapper.find('[data-cy="login-again"]').simulate("click");
    expect(onExit).toHaveBeenCalled();
  });
});
