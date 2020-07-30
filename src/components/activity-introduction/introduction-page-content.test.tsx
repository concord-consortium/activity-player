import React from "react";
import { IntroductionPageContent } from "./introduction-page-content";
import { shallow } from "enzyme";
import { DefaultTestActivity } from "../../test-utils/model-for-tests";

describe("Introduction Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<IntroductionPageContent activity={DefaultTestActivity} onPageChange={stubFunction} />);
    expect(wrapper.find('[data-cy="intro-page-content"]').length).toBe(1);
  });
});
