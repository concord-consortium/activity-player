import React from "react";
import { SecondaryEmbeddable } from "./secondary-embeddable";
import { shallow } from "enzyme";

describe("Secondary Embeddable component", () => {
  it("renders component", () => {
    const wrapper = shallow(<SecondaryEmbeddable embeddable={undefined} questionNumber={1} />);
    expect(wrapper.find('[data-cy="secondary-embeddable"]').length).toBe(1);
    expect(wrapper.text()).toEqual("Question #1");
  });
});
