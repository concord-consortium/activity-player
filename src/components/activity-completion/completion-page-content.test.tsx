import React from "react";
import { CompletionPageContent } from "./completion-page-content";
import { shallow } from "enzyme";

describe("Completion Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<CompletionPageContent activityName={"test"} isActivityComplete={true} onPageChange={stubFunction} showStudentReport={true} thumbnailURL={""} />);
    expect(wrapper.find('[data-cy="completion-page-content"]').length).toBe(1);
  });
});
