import React from "react";
import { RelatedContent } from "./related-content";
import { shallow } from "enzyme";

describe("Related Content component", () => {
  it("renders component", () => {
    const wrapper = shallow(<RelatedContent relatedContentText={"content here"} />);
    expect(wrapper.find('[data-cy="related-content"]').length).toBe(1);
    expect(wrapper.find('[data-cy="related-content-header"]').length).toBe(1);
    expect(wrapper.find('[data-cy="related-content-text"]').length).toBe(1);
  });
});
