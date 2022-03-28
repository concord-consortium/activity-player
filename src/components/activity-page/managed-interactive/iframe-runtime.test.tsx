import React from "react";
import { IframeRuntime } from "./iframe-runtime";
import { act, configure, fireEvent, render } from "@testing-library/react";
import { ICustomMessage } from "@concord-consortium/lara-interactive-api";

configure({ testIdAttribute: "data-cy" });

const mockLog = jest.fn();
jest.mock("../../../lib/logger", () => ({
  ...jest.requireActual("../../../lib/logger"),
  Logger: {
    log: (...args: any) => mockLog(...args)
  }
}));

const lastCall = (mockFn: jest.Mock) => mockFn.mock.calls[mockFn.mock.calls.length - 1];

const mockPost = jest.fn();
const lastPost = () => lastCall(mockPost)[0];
const lastPostData = () => lastCall(mockPost)[1];
const mockListeners: Record<string, (data?: any) => void> = {};
const mockAddListener = jest.fn((message: string, callback: (data?: any) => void) => {
  mockListeners[message] = callback;
});
const dispatchMessageFromChild = (message: string, data: any) => {
  const listener = mockListeners[message];
  listener?.(data);
};
const mockDisconnect = jest.fn();
jest.mock("iframe-phone", () => ({
  ParentEndpoint: jest.fn((targetIframe, afterConnectedCallback) => {
    // setTimeout allows phone initialization to complete
    setTimeout(() => afterConnectedCallback());
    return {
      post: mockPost,
      addListener: mockAddListener,
      disconnect: mockDisconnect
    };
  })
}));

const mockSnapshot = jest.fn();
jest.mock("shutterbug", () => ({
  snapshot: (options: any) => mockSnapshot(options)
}));

describe("IframeRuntime component", () => {

  beforeEach(() => {
    jest.useFakeTimers();
    global.confirm = jest.fn(() => true) as jest.Mock<any>;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("renders component", async () => {
    const mockSetInteractiveState = jest.fn();
    const mockSetSupportedFeatures = jest.fn();
    const mockSetNavigation = jest.fn();
    const mockGetFirebaseJWT = jest.fn(() => Promise.resolve("stub"));
    const mockSetNewHint = jest.fn();
    const mockAttachmentUrl = "https://concord.org/attachment/url";
    const mockGetAttachmentUrl = jest.fn(() => Promise.resolve({ url: mockAttachmentUrl, requestId: 1 }));
    const mockShowModal = jest.fn();
    const mockCloseModal = jest.fn();
    type CustomMsgSender = (msg: ICustomMessage) => void;
    let mockSendCustomMessage: CustomMsgSender;
    const mockSetSendCustomMessage = jest.fn((sendMsg: CustomMsgSender) => {
      mockSendCustomMessage = sendMsg;
    });
    const testIframe = render(
      <IframeRuntime
        url={"https://concord.org/"}
        id={"123-Interactive"}
        authoredState={null}
        initialInteractiveState={null}
        legacyLinkedInteractiveState={null}
        setInteractiveState={mockSetInteractiveState}
        setSupportedFeatures={mockSetSupportedFeatures}
        setNewHint={mockSetNewHint}
        getFirebaseJWT={mockGetFirebaseJWT}
        getAttachmentUrl={mockGetAttachmentUrl}
        showModal={mockShowModal}
        closeModal={mockCloseModal}
        setSendCustomMessage={mockSetSendCustomMessage}
        setNavigation={mockSetNavigation}
        iframeTitle="Interactive content"
        showDeleteDataButton={true}
      />);
    expect(testIframe.getByTestId("iframe-runtime")).toBeDefined();
    // allow initialization to complete
    jest.runAllTimers();
    expect(lastPost()).toBe("initInteractive");
    expect(mockSetSendCustomMessage).toHaveBeenCalled();

    act(() => {
      mockSendCustomMessage({ type: "custom", content: {} });
    });
    expect(lastPost()).toBe("customMessage");

    expect(mockSetInteractiveState).not.toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("interactiveState", {});
    });
    expect(mockSetInteractiveState).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("interactiveState", "nochange");
    });
    // "nochange" message doesn't result in another call
    expect(mockSetInteractiveState).toHaveBeenCalledTimes(1);

    act(() => {
      dispatchMessageFromChild("interactiveState", "touch");
    });
    // "touch" message results in another call
    expect(mockSetInteractiveState).toHaveBeenCalledTimes(2);

    act(() => {
      dispatchMessageFromChild("interactiveState", {});
    });
    // saving the same interactive state doesn't result in another call
    expect(mockSetInteractiveState).toHaveBeenCalledTimes(2);

    act(() => {
      dispatchMessageFromChild("interactiveState", {foo: "bar"});
    });
    // saving a different interactive state results in another call
    expect(mockSetInteractiveState).toHaveBeenCalledTimes(3);

    act(() => {
      dispatchMessageFromChild("height", 960);
    });
    // TODO: verify that height was handled properly

    act(() => {
      dispatchMessageFromChild("supportedFeatures", { features: { aspectRatio: 1.5 } });
    });
    expect(mockSetSupportedFeatures).toHaveBeenCalled();
    expect(lastPost()).toBe("decorateContent");

    act(() => {
      dispatchMessageFromChild("navigation", {});
    });
    expect(mockSetNavigation).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("getFirebaseJWT", {});
    });
    expect(mockGetFirebaseJWT).toHaveBeenCalled();
    // wait for promise resolution
    await Promise.resolve("foo");
    expect(lastPost()).toBe("firebaseJWT");
    expect(lastPostData().token).toBeDefined();

    // handles errors from getFirebaseJWT()
    mockGetFirebaseJWT.mockImplementation(() => Promise.reject("error"));
    act(() => {
      dispatchMessageFromChild("getFirebaseJWT", {});
    });
    expect(mockGetFirebaseJWT).toHaveBeenCalledTimes(2);
    // wait for promise resolution
    await Promise.resolve("foo");
    expect(lastPost()).toBe("firebaseJWT");
    expect(lastPostData().response_type).toBe("ERROR");

    const mockSnapshotUrl = "https://concord.org/snapshot/url";
    mockSnapshot.mockImplementation((options: any) => {
      options.done(mockSnapshotUrl);
    });
    act(() => {
      dispatchMessageFromChild("getInteractiveSnapshot", {});
    });
    expect(mockSnapshot).toHaveBeenCalled();
    expect(lastPost()).toBe("interactiveSnapshot");
    expect(lastPostData().success).toBe(true);
    expect(lastPostData().snapshotUrl).toBe(mockSnapshotUrl);

    mockSnapshot.mockImplementation((options: any) => {
      // suppress console error
      const mockConsoleError = jest.spyOn(global.console, "error").mockImplementation(() => null);
      options.fail();
      mockConsoleError.mockRestore();
    });
    act(() => {
      dispatchMessageFromChild("getInteractiveSnapshot", {});
    });
    expect(mockSnapshot).toHaveBeenCalled();
    expect(lastPost()).toBe("interactiveSnapshot");
    expect(lastPostData().success).toBe(false);

    act(() => {
      dispatchMessageFromChild("hint", "new-hint");
    });
    expect(mockSetNewHint).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("decoratedContentEvent", {});
    });

    act(() => {
      dispatchMessageFromChild("getAttachmentUrl", {});
    });
    expect(mockGetAttachmentUrl).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("showModal", {});
    });
    expect(mockShowModal).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("closeModal", {});
    });
    expect(mockCloseModal).toHaveBeenCalled();

    act(() => {
      dispatchMessageFromChild("log", {});
    });
    expect(mockLog).toHaveBeenCalledTimes(1);

    const resetButton = testIframe.getByTestId("reset-button");
    expect(resetButton).toBeDefined();
    expect(mockSetInteractiveState).toHaveBeenCalledTimes(3);
    act(() => {
      fireEvent.click(resetButton);
    });
    expect(global.confirm).toHaveBeenCalledTimes(1);
    expect(mockSetInteractiveState).toHaveBeenCalledTimes(5);
  });
});
