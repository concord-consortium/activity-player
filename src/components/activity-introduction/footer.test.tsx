import React from "react";
import { Footer } from "./footer";
import { shallow } from "enzyme";

describe("Footer component", () => {
  const project = {
    about: null,
    collaborators: null,
    collaborators_image_url: null,
    contact_email: null,
    copyright: null,
    copyright_image_url: "",
    footer: "This ConnectedBio activity was developed with a grant from the National Science Foundation (DRL-1620910) in collaboration with Michigan State University.",
    funders_image_url: null,
    logo_ap: "https://static.concord.org/projects/logos/ap/connectedbio-logo.png",
    logo_lara: "https://static.concord.org/projects/logos/lara/connectedbio-logo.png",
    project_key: "connectedbio",
    title: "ConnectedBio",
    url: "https://concord.org/connectedbio"
  };

  it("renders footer text", () => {
    // Uses ConnectedBio because it has the simplest text
    const footerText = "This ConnectedBio activity was developed with a grant from the National Science Foundation (DRL-1620910) in collaboration with Michigan State University.";
    const wrapper = shallow(<Footer fullWidth={true} project={project} />);
    expect(wrapper.text()).toContain(footerText);
  });
  it("renders default footer text when no project is specified", () => {
    const currentYear = new Date().getFullYear();
    const footerText = `Copyright © ${currentYear} The Concord Consortium. All rights reserved. This material is licensed under a Creative Commons Attribution 4.0 License. The software is licensed under Simplified BSD, MIT or Apache 2.0 licenses. Please provide attribution to the Concord Consortium and the URL https://concord.org.`;
    const wrapper = shallow(<Footer fullWidth={true} project={null} />);
    expect(wrapper.text()).toContain(footerText);
  });
});
