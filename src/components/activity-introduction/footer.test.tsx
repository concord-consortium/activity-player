import React from "react";
import { Footer } from "./footer";
import { shallow } from "enzyme";

describe("Footer component", () => {
  const aboutText = "This is a test project.";
  const collaboratorsText = "This project is a collaboration.";
  const collaboratorsImageUrl = "https://concord.org/collaborator-logos.png";
  const fundersImageUrl = "https://concord.org/funder-logos.png";
  const copyrightText = "All project content is licensed under a Creative Commons Attribution-NonCommercial 4.0 International license.";
  const copyrightImageUrl = "https://concord.org/copyright-image.png";
  const contactText = "For more information, please email test@concord.org.";
  const footerText = "This is text about the project saved in the deprecated footer field.";
  const logoAp = "https://static.concord.org/projects/logos/ap/project-logo.png";
  const logoLara = "https://static.concord.org/projects/logos/lara/project-logo.png";
  const projectKey = "test-project";
  const projectTitle = "Test project";
  const projectUrl = "https://concord.org/test-project";

  const project = {
    about: aboutText,
    collaborators: collaboratorsText,
    collaborators_image_url: collaboratorsImageUrl,
    contact_email: contactText,
    copyright: copyrightText,
    copyright_image_url: copyrightImageUrl,
    footer: footerText,
    funders_image_url: fundersImageUrl,
    logo_ap: logoAp,
    logo_lara: logoLara,
    project_key: projectKey,
    title: projectTitle,
    url: projectUrl
  };

  const connectedBioProject = {
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

  it("renders copyright and collaborator content when values are present instead of the deprecated footer value", () => {
    const wrapper = shallow(<Footer fullWidth={true} project={project} />);
    expect(wrapper.text()).toContain(collaboratorsText);
    expect(wrapper.html()).toContain(collaboratorsImageUrl);
    expect(wrapper.html()).toContain(fundersImageUrl);
    expect(wrapper.text()).toContain(copyrightText);
    expect(wrapper.html()).toContain(copyrightImageUrl);
    expect(wrapper.text()).toContain(contactText);
    expect(wrapper.text()).not.toContain(footerText);
  });
  it("renders footer text when copyright and collaborator content values are not present", () => {
    // Uses ConnectedBio because it has the simplest text
    const cBioFooterText = "This ConnectedBio activity was developed with a grant from the National Science Foundation (DRL-1620910) in collaboration with Michigan State University.";
    const wrapper = shallow(<Footer fullWidth={true} project={connectedBioProject} />);
    expect(wrapper.text()).toContain(cBioFooterText);
  });
  it("renders default footer text when no project is specified", () => {
    const currentYear = new Date().getFullYear();
    const defaultFooterText = `Copyright © ${currentYear} The Concord Consortium. All rights reserved. This material is licensed under a Creative Commons Attribution 4.0 License. The software is licensed under Simplified BSD, MIT or Apache 2.0 licenses. Please provide attribution to the Concord Consortium and the URL https://concord.org.`;
    const wrapper = shallow(<Footer fullWidth={true} project={null} />);
    expect(wrapper.text()).toContain(defaultFooterText);
  });
});
