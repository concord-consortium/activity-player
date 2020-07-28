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
});
