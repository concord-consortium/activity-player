import React from "react";
import { Error, errorMsg } from "./error";
import { shallow } from "enzyme";

describe("Error component", () => {
  it("renders authentication error message", () => {
    const wrapper = shallow(<Error type="auth" />);
    expect(wrapper.find('[data-cy="error"]').length).toBe(1);
    expect(wrapper.text()).toContain(errorMsg.auth);
  });
  it("renders network error message", () => {
    const wrapper = shallow(<Error type="network" />);
    expect(wrapper.find('[data-cy="error"]').length).toBe(1);
    expect(wrapper.text()).toContain(errorMsg.network);
  });
  it("renders session timeout error message", () => {
    const wrapper = shallow(<Error type="timeout" />);
    expect(wrapper.find('[data-cy="error"]').length).toBe(1);
    expect(wrapper.text()).toContain(errorMsg.timeout);
  });
});
