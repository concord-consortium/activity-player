import React from "react";
import { Header } from "./header";
import { AccountOwner } from "./account-owner";
import { shallow, mount } from "enzyme";
import { Logo } from "./logo";

describe("Header component", () => {
  const project1 = {
    about: null,
    collaborators: null,
    collaborators_image_url: null,
    contact_email: null,
    copyright: null,
    copyright_image_url: "",
    footer: null,
    funders_image_url: null,
    logo_ap: "https://static.concord.org/projects/logos/ap/mw-logo.png",
    logo_lara: "https://static.concord.org/projects/logos/lara/mw-logo.png",
    project_key: "molecular-workbench",
    title: "Molecular Workbench",
    url: "http://mw.concord.org/nexgen"
  };

  const project2 = {
    about: null,
    collaborators: null,
    collaborators_image_url: null,
    contact_email: null,
    copyright: null,
    copyright_image_url: "",
    footer: null,
    funders_image_url: null,
    logo_ap: null,
    logo_lara: null,
    project_key: "default",
    title: "Default",
    url: null
  };

  it("renders header project icon", () => {
    const headerLogo1 = <Logo logo={project1.logo_ap} url={project1.url}/>;
    const headerLogo9 = <Logo logo={undefined} url={"https://concord.org/"}/>;

    const wrapperIcon = shallow(<Header project={project1} userName={"test student"} contentName={"test activity"} />);
    expect(wrapperIcon.containsMatchingElement(headerLogo1)).toEqual(true);

    const wrapperNoIcon = shallow(<Header project={project2} userName={"test student"} contentName={"test activity"} />);
    expect(wrapperNoIcon.containsMatchingElement(headerLogo9)).toEqual(true);
  });
  it("renders activity title", () => {
    const wrapperDropdown = mount(<Header project={project1} userName={"test student"} contentName={"test activity"} />);
    expect(wrapperDropdown.text()).toContain("test activity");
  });
  it("renders user name", () => {
      const user = "Student User";
      const accountOwner = <AccountOwner userName={user} />;

      const wrapperAccountOwner = shallow(accountOwner);
      const wrapperHeader = shallow(<Header project={project1} userName={user} contentName={"test activity"} />);
      expect(wrapperHeader.containsMatchingElement(accountOwner)).toEqual(true);
      expect(wrapperAccountOwner.text()).toContain(user);
  });
});
