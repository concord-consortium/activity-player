import React from "react";
import { TeacherEditionBanner } from "./teacher-edition-banner";
import IconTeacherEdition from "../assets/svg-icons/icon-teacher-edition.svg";
import { shallow } from "enzyme";

describe("Teacher Edition Banner component", () => {
  it("renders teacher edition banner", () => {
    const wrapper = shallow(<TeacherEditionBanner/>);
    expect(wrapper.find('[data-cy="teacher-edition-banner"]').length).toBe(1);
    expect(wrapper.find('[data-cy="teacher-edition-banner"]').text()).toContain("Teacher Edition");
    expect(wrapper.containsMatchingElement(<IconTeacherEdition width={48} height={48}/>)).toEqual(true);

  });
});
