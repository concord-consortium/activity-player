import React from "react";
import { IframeRuntime } from "./iframe-runtime";
import { shallow } from "enzyme";

describe("IframeRuntime component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<IframeRuntime url={"https://www.google.com/"} authoredState={null} interactiveState={null} setInteractiveState={stubFunction} setNewHint={stubFunction} />);
    expect(wrapper.find('[data-cy="iframe-runtime"]').length).toBe(1);
  });
});
