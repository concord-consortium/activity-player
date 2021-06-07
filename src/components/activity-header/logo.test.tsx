import React from "react";
import { Logo } from "./logo";
import { shallow } from "enzyme";
import { accessibilityClick } from "../../utilities/accessibility-helper";
import CCLogo from "../../assets/svg-icons/cclogo.svg";

describe("Logo component", () => {
  it("renders logo when logo is specified", () => {
    const wrapper = shallow(<Logo logo={CCLogo} url={"https://concord.org/"} />);
    expect(wrapper.find('[data-cy="project-logo"]').length).toBe(1);
    expect(wrapper.find(".logo-img").length).toBe(1);
  });
  it("renders default logo when no logo is specified", () => {
    const wrapper = shallow(<Logo logo={undefined} url={undefined} />);
    expect(wrapper.find('[data-cy="project-logo"]').length).toBe(1);
    expect(wrapper.find(".icon").length).toBe(1);
  });
});