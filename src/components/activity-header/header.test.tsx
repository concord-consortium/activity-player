import React from "react";
import { Header } from "./header";
import { AccountOwner } from "./account-owner";
import { shallow } from "enzyme";
import { Logo } from "./logo";
import mwLogo from "../../assets/project-images/mw-logo.png";
import ccLogo from "../../assets/cc-logo.png";

describe("Header component", () => {
  it("renders header project icon", () => {
    const headerLogo1 = <Logo logo={mwLogo} url={"http://mw.concord.org/nextgen/"}/>;
    const headerLogo9 = <Logo logo={ccLogo} url={"https://concord.org/"}/>;

    const wrapperIcon = shallow(<Header projectId={1} userName={"test student"} contentName={"test activity"} singlePage={false} />);
    expect(wrapperIcon.containsMatchingElement(headerLogo1)).toEqual(true);

    const wrapperNoIcon = shallow(<Header projectId={9} userName={"test student"} contentName={"test activity"} singlePage={false} />);
    expect(wrapperNoIcon.containsMatchingElement(headerLogo9)).toEqual(true);
  });
  it("renders activity title dropdown when appropriate", () => {
    const activityDropdown = <div className="activity-title" data-cy ="activity-title">Activity:</div>;

    const wrapperDropdown = shallow(<Header projectId={1} userName={"test student"} contentName={"test activity"} singlePage={false} />);
    expect(wrapperDropdown.containsMatchingElement(activityDropdown)).toEqual(true);

    const wrapperNoDropdown = shallow(<Header projectId={1} userName={"test student"} contentName={"test activity"} singlePage={true} />);
    expect(wrapperNoDropdown.containsMatchingElement(activityDropdown)).toEqual(false);
  });
  it("renders user name", () => {
      const user = "Student User";
      const accountOwner = <AccountOwner userName={user} />;

      const wrapperAccountOwner = shallow(accountOwner);
      const wrapperHeader = shallow(<Header projectId={1} userName={user} contentName={"test activity"} singlePage={false} />);
      expect(wrapperHeader.containsMatchingElement(accountOwner)).toEqual(true);
      expect(wrapperAccountOwner.text()).toContain(user);
  });
});
