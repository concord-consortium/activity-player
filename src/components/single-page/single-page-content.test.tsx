import React from "react";
import { SinglePageContent } from "./single-page-content";
import { shallow } from "enzyme";
import { DefaultTestActivity } from "../../test-utils/model-for-tests";

describe("Single Page Content component", () => {
  it("renders component", () => {
    const wrapper = shallow(<SinglePageContent activity={DefaultTestActivity} />);
    expect(wrapper.find('[data-cy="single-page-content"]').length).toBe(1);
  });
});
