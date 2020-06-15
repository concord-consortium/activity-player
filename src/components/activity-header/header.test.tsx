import React from "react";
import { Header } from "./header";
import { shallow } from "enzyme";

describe("Header component", () => {
  it("renders header project icon", () => {
    const projectLogo = <img data-cy="project-logo" />;

    const wrapperIcon = shallow(<Header projectId={1} />);
    expect(wrapperIcon.containsMatchingElement(projectLogo)).toEqual(true);

    const wrapperNoIcon = shallow(<Header />);
    expect(wrapperNoIcon.containsMatchingElement(projectLogo)).toEqual(false);
  });
});
