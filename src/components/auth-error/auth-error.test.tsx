import React from "react";
import { AuthError } from "./auth-error";
import { shallow } from "enzyme";

describe("Auth Error component", () => {
  it("renders authentication error message", () => {
    const wrapper = shallow(<AuthError/>);
    expect(wrapper.find('[data-cy="single-page-content"]').length).toBe(1);
    expect(wrapper.find("h1").text()).toContain("Session Timed Out");
  });
});
