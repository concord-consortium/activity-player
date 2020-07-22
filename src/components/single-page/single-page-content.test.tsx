import React from "react";
import { SinglePageContent } from "./single-page-content";
import { shallow } from "enzyme";

describe("Single Page Content component", () => {
  it("renders component", () => {
    const activity = { name: "test", description: "test", time_to_complete: 10, pages: [] };
    const wrapper = shallow(<SinglePageContent activity={activity} />);
    expect(wrapper.find('[data-cy="single-page-content"]').length).toBe(1);
  });
});
