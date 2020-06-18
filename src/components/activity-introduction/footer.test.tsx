import React from "react";
import Footer from "./footer";
import { shallow } from "enzyme";

describe("Footer component", () => {
  it("renders footer text", () => {
    const footerText = "Copyright © 2020 The Concord Consortium. All rights reserved. " +
                       "This material is licensed under a Creative Commons Attribution 4.0 License. " +
                       "The software is licensed under Simplified BSD, MIT or Apache 2.0 licenses. " +
                       "Please provide attribution to the Concord Consortium and the URL http://concord.org.";
    const wrapper = shallow(<Footer />);
    expect(wrapper.text()).toEqual(footerText);
  });
});
