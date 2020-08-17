import React from "react";
import { IframeRuntime } from "./iframe-runtime";
import { configure, render } from "@testing-library/react";

configure({ testIdAttribute: "data-cy" });

describe("IframeRuntime component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    // @testing-library tests more, including unmount
    const { getByTestId } = render(
      <IframeRuntime
        url={"https://www.google.com/"}
        authoredState={null}
        initialInteractiveState={null}
        setInteractiveState={stubFunction}
        setNewHint={stubFunction}
      />);
    expect(getByTestId("iframe-runtime")).toBeDefined();
  });
});
