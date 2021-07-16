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
    const attachmentUrlStub = () => {
      return Promise.resolve({ url: "url", requestId: 1 });
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
        getAttachmentUrl={attachmentUrlStub}
        showModal={stubFunction}
        closeModal={stubFunction}
        setSendCustomMessage={stubFunction}
        iframeTitle="Interactive content"
      />);
    expect(getByTestId("iframe-runtime")).toBeDefined();
  });
});
