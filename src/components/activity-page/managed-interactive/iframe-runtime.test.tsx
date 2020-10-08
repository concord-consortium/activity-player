import React from "react";
import { IframeRuntime } from "./iframe-runtime";
import { configure, render } from "@testing-library/react";

configure({ testIdAttribute: "data-cy" });

describe("IframeRuntime component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const firebaseJWTStub = () => {
      return Promise.resolve("stub");
    };
    // @testing-library tests more, including unmount
    const { getByTestId } = render(
      <IframeRuntime
        url={"https://www.google.com/"}
        id={"123-Interactive"}
        authoredState={null}
        initialInteractiveState={null}
        setInteractiveState={stubFunction}
        setSupportedFeatures={stubFunction}
        setNewHint={stubFunction}
        getFirebaseJWT={firebaseJWTStub}
        showModal={stubFunction}
        closeModal={stubFunction}
        setSendCustomMessage={stubFunction}
      />);
    expect(getByTestId("iframe-runtime")).toBeDefined();
  });
});
