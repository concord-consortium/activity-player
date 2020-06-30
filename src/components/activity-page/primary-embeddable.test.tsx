import React from "react";
import { PrimaryEmbeddable } from "./primary-embeddable";
import { shallow } from "enzyme";

describe("Primary Embeddable component", () => {
  it("renders component", () => {
    const wrapper = shallow(<PrimaryEmbeddable embeddable={undefined} />);
    expect(wrapper.find('[data-cy="primary-embeddable"]').length).toBe(1);
  });
});
