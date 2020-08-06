import React from "react";
import { Footer } from "./footer";
import { shallow } from "enzyme";

describe("Footer component", () => {
  it("renders footer text", () => {
    // Uses ConnectedBio because it has the simplest text
    const footerText = "This ConnectedBio activity was developed with a grant from the National Science Foundation (DRL-1620910) in collaboration with Michigan State University.";
    const wrapper = shallow(<Footer fullWidth={true} projectId={13} />);
    expect(wrapper.text()).toContain(footerText);
  });
  it("renders default footer text when no project is specified", () => {
    const footerText = "Copyright © 2020 The Concord Consortium. All rights reserved. This material is licensed under a Creative Commons Attribution 4.0 License. The software is licensed under Simplified BSD, MIT or Apache 2.0 licenses. Please provide attribution to the Concord Consortium and the URL http://concord.org.";
    const wrapper = shallow(<Footer fullWidth={true} projectId={null} />);
    expect(wrapper.text()).toContain(footerText);
  });
  it("renders footer logos", () => {
    const wrapper = shallow(<Footer fullWidth={true} projectId={2} />);
    expect(wrapper.find('[data-cy="footer-logo-container"]').length).toBe(1);
    expect(wrapper.find('[data-cy="partner-logo"]').length).toBe(4);
  });
});
