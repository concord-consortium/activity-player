import React from "react";
import { Header } from "./header";
import { AccountOwner } from "./account-owner";
import { shallow } from "enzyme";
import { Logo } from "./logo";
import mwLogo from "../../assets/project-images/mw-logo.png";

describe("Header component", () => {
  it("renders header project icon", () => {
    const headerLogo1 = <Logo logo={mwLogo} url={"http://mw.concord.org/nextgen/"}/>;
    const headerLogo9 = <Logo logo={undefined} url={"https://concord.org/"}/>;

    const wrapperIcon = shallow(<Header projectId={1} userName={"test student"} contentName={"test activity"} />);
    expect(wrapperIcon.containsMatchingElement(headerLogo1)).toEqual(true);

    const wrapperNoIcon = shallow(<Header projectId={9} userName={"test student"} contentName={"test activity"} />);
    expect(wrapperNoIcon.containsMatchingElement(headerLogo9)).toEqual(true);
  });
  it("renders activity title", () => {
    const wrapperDropdown = shallow(<Header projectId={1} userName={"test student"} contentName={"test activity"} />);
    expect(wrapperDropdown.text()).toContain("test activity");
  });
  it("renders user name", () => {
      const user = "Student User";
      const accountOwner = <AccountOwner userName={user} />;

      const wrapperAccountOwner = shallow(accountOwner);
      const wrapperHeader = shallow(<Header projectId={1} userName={user} contentName={"test activity"} />);
      expect(wrapperHeader.containsMatchingElement(accountOwner)).toEqual(true);
      expect(wrapperAccountOwner.text()).toContain(user);
  });
});
