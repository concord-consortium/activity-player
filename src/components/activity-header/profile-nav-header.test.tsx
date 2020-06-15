import React from "react";
import { ProfileNavHeader } from "./profile-nav-header";
import { shallow } from "enzyme";

describe("Profile Nav Header component", () => {
  it("renders menu", () => {
    const wrapper = shallow(<ProfileNavHeader name="username" />);
    expect(wrapper.containsMatchingElement(<span>Welcome, </span>)).toEqual(true);
    expect(wrapper.containsMatchingElement(<span>username</span>)).toEqual(true);
  });
});
