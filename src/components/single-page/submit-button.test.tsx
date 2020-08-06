import React from "react";
import { SubmitButton } from "./submit-button";
import { shallow } from "enzyme";

describe("Submit Button component", () => {
  it("renders submit button", () => {
    const wrapper = shallow(<SubmitButton/>);
    expect(wrapper.find('[data-cy="submit-button"]').length).toBe(1);
  });
});
