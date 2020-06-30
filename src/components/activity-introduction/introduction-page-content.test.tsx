import React from "react";
import { IntroductionPageContent } from "./introduction-page-content";
import { shallow } from "enzyme";

describe("Introduction Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const activity = { name: "test", description: "test", time_to_complete: 10, pages: [] }
    const wrapper = shallow(<IntroductionPageContent activity={activity} onPageChange={stubFunction} />);
    expect(wrapper.find('[data-cy="intro-page-content"]').length).toBe(1);
  });
});
