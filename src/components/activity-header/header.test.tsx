import React from "react";
import { Header } from "./header";
import { shallow } from "enzyme";

describe("Header component", () => {
  it("renders header project icon", () => {
    const headerLogo = <img data-cy="project-logo" />;

    const wrapperIcon = shallow(<Header projectId={1} />);
    expect(wrapperIcon.containsMatchingElement(headerLogo)).toEqual(true);

    const wrapperNoIcon = shallow(<Header projectId={9} />);
    expect(wrapperNoIcon.containsMatchingElement(headerLogo)).toEqual(false);
  });
});
