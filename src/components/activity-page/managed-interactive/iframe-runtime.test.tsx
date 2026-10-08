import React from "react";
import jwt from "jsonwebtoken";
import iframePhone from "iframe-phone";
import { IframeRuntime, IframeRuntimeImperativeAPI } from "./iframe-runtime";
import { kSessionExpiredMessage } from "../../error/error-messages";
import { sessionExpiredError } from "../../../portal-jwt-manager";
import { initializeObjectStorageJWT } from "../../../firebase-jwt-cache";
import { act, configure, fireEvent, render } from "@testing-library/react";
import { ICustomMessage } from "@concord-consortium/lara-interactive-api";
import { DynamicTextTester } from "../../../test-utils/dynamic-text";
import { MediaLibraryTester } from "../../../test-utils/media-library";
import {
  initializeOverrides,
  resetOverridesForTesting,
} from "../../../utilities/url-overrides/state";
import { RegistryJson } from "../../../utilities/url-overrides/types";

configure({ testIdAttribute: "data-cy" });

const mockLog = jest.fn();
jest.mock("../../../lib/logger", () => ({
  ...jest.requireActual("../../../lib/logger"),
  Logger: {
    log: (...args: any) => mockLog(...args)
  }
}));

const lastCall = (mockFn: jest.Mock) => mockFn.mock.calls[mockFn.mock.calls.length - 1];
const nextToLastCall = (mockFn: jest.Mock) => mockFn.mock.calls[mockFn.mock.calls.length - 2];

const mockPost = jest.fn();
const lastPost = () => lastCall(mockPost)[0];
const lastPostData = () => lastCall(mockPost)[1];
const nextToLastPost = () => nextToLastCall(mockPost)[0];
const nextToLastPostData = () => nextToLastCall(mockPost)[1];
const mockListeners: Record<string, (data?: any) => void> = {};
const mockAddListener = jest.fn((message: string, callback: (data?: any) => void) => {
  mockListeners[message] = callback;
});
const dispatchMessageFromChild = (message: string, data: any) => {
  const listener = mockListeners[message];
  listener?.(data);
};
const mockDisconnect = jest.fn();
const mockRemoveListener = jest.fn();
jest.mock("iframe-phone", () => ({
  ParentEndpoint: jest.fn((targetIframe, afterConnectedCallback) => {
    // setTimeout allows phone initialization to complete
    setTimeout(() => afterConnectedCallback());
    return {
      post: mockPost,
      addListener: mockAddListener,
      removeListener: mockRemoveListener,
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
    // The iframe-phone mock fns are module-level singletons; clear their call
    // history between tests so per-test assertions (e.g. the focusExit listener
    // registration) can't see calls left over from a prior test.
    mockPost.mockClear();
    mockAddListener.mockClear();
    mockRemoveListener.mockClear();
    mockDisconnect.mockClear();
    (iframePhone.ParentEndpoint as unknown as jest.Mock).mockClear();
    // Override state is a module-level singleton; reset here so it can't leak
    // into later tests even if a test throws before its own cleanup.
    resetOverridesForTesting();
  });

  const runtimeWith = (extraProps: Record<string, any> = {}) =>
      <MediaLibraryTester>
        <DynamicTextTester>
          <IframeRuntime
            url={"https://concord.org/"}
            id={"123-Interactive"}
            authoredState={null}
            initialInteractiveState={{ testing: true }}
            legacyLinkedInteractiveState={null}
            setInteractiveState={jest.fn()}
            setAspectRatio={jest.fn()}
            setHeightFromInteractive={jest.fn()}
            setSupportedFeatures={jest.fn()}
            setNewHint={jest.fn()}
            getFirebaseJWT={jest.fn(() => Promise.resolve("stub"))}
            getAttachmentUrl={jest.fn(() => Promise.resolve({ url: "u", requestId: 1 }))}
            showModal={jest.fn()}
            closeModal={jest.fn()}
            setSendCustomMessage={jest.fn()}
            setNavigation={jest.fn()}
            log={mockLog}
            iframeTitle="Interactive content"
            {...extraProps}
          />
        </DynamicTextTester>
      </MediaLibraryTester>;
  const renderWith = (extraProps: Record<string, any> = {}) => render(runtimeWith(extraProps));

  it("makes the whole runtime inert only while disabled", () => {
    const disabled = renderWith({ disabled: true });
    expect(disabled.container.querySelector('[data-cy="iframe-runtime"]')?.hasAttribute("inert")).toBe(true);
    disabled.unmount();
    const enabled = renderWith();
    expect(enabled.container.querySelector('[data-cy="iframe-runtime"]')?.hasAttribute("inert")).toBe(false);
  });

  it("renders before/after sentinels around the iframe with tabindex=-1", () => {
    const mockSetInteractiveState = jest.fn();
    const mockSetSupportedFeatures = jest.fn();
    const mockSetNavigation = jest.fn();
    const mockGetFirebaseJWT = jest.fn(() => Promise.resolve("stub"));
    const mockSetNewHint = jest.fn();
    const mockAttachmentUrl = "https://concord.org/attachment/url";
    const mockGetAttachmentUrl = jest.fn(() => Promise.resolve({ url: mockAttachmentUrl, requestId: 1 }));
    const mockShowModal = jest.fn();
    const mockCloseModal = jest.fn();
    const mockSetAspectRatio = jest.fn();
    const mockSetHeightFromInteractive = jest.fn();
    const mockSetSendCustomMessage = jest.fn();
    const { container } = render(
      <MediaLibraryTester>
        <DynamicTextTester>
          <IframeRuntime
            url={"https://concord.org/"}
            id={"123-Interactive"}
            authoredState={null}
            initialInteractiveState={{testing: true}}
            legacyLinkedInteractiveState={null}
            setInteractiveState={mockSetInteractiveState}
            setAspectRatio={mockSetAspectRatio}
            setHeightFromInteractive={mockSetHeightFromInteractive}
            setSupportedFeatures={mockSetSupportedFeatures}
            setNewHint={mockSetNewHint}
            getFirebaseJWT={mockGetFirebaseJWT}
            getAttachmentUrl={mockGetAttachmentUrl}
            showModal={mockShowModal}
            closeModal={mockCloseModal}
            setSendCustomMessage={mockSetSendCustomMessage}
            setNavigation={mockSetNavigation}
            log={mockLog}
            iframeTitle="Interactive content"
            showDeleteDataButton={true}
          />
        </DynamicTextTester>
      </MediaLibraryTester>
    );
    const sentinels = container.querySelectorAll(".iframe-slot-sentinel");
    expect(sentinels.length).toBe(2);
    sentinels.forEach((s) => expect(s.getAttribute("tabindex")).toBe("-1"));
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(sentinels[0].nextElementSibling).toBe(iframe);
    expect(sentinels[1].previousElementSibling).toBe(iframe);
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
    const mockSetAspectRatio = jest.fn();
    const mockSetHeightFromInteractive = jest.fn();

    type CustomMsgSender = (msg: ICustomMessage) => void;
    let mockSendCustomMessage: CustomMsgSender;
    const mockSetSendCustomMessage = jest.fn((sendMsg: CustomMsgSender) => {
      mockSendCustomMessage = sendMsg;
    });
    const testIframe = render(
      <MediaLibraryTester>
        <DynamicTextTester>
          <IframeRuntime
            url={"https://concord.org/"}
            id={"123-Interactive"}
            authoredState={null}
            initialInteractiveState={{testing: true}}
            legacyLinkedInteractiveState={null}
            setInteractiveState={mockSetInteractiveState}
            setAspectRatio={mockSetAspectRatio}
            setHeightFromInteractive={mockSetHeightFromInteractive}
            setSupportedFeatures={mockSetSupportedFeatures}
            setNewHint={mockSetNewHint}
            getFirebaseJWT={mockGetFirebaseJWT}
            getAttachmentUrl={mockGetAttachmentUrl}
            showModal={mockShowModal}
            closeModal={mockCloseModal}
            setSendCustomMessage={mockSetSendCustomMessage}
            setNavigation={mockSetNavigation}
            log={mockLog}
            iframeTitle="Interactive content"
            showDeleteDataButton={true}
            answerMetadata={{
              type: "interactive_state",
              answer: JSON.stringify({foo: "bar"}),
              question_id: "interactive_123",
              question_type: "interactive",
              id: "test1234",
              submitted: true,
              report_state: "",
              attachments: {
                "test.png": {
                  publicPath: "/foo/bar/test.png",
                  folder: {
                    id: "123",
                    ownerId: "testuser",
                  },
                  contentType: "image/png",
                },
                "test.mp3": {
                  publicPath: "/foo/bar/test.mp3",
                  folder: {
                    id: "123",
                    ownerId: "testuser",
                  },
                  contentType: "audio/mp3",
                }
              }
            }}
          />
        </DynamicTextTester>
      </MediaLibraryTester>
    );
    expect(testIframe.getByTestId("iframe-runtime")).toBeDefined();
    // allow initialization to complete
    jest.runAllTimers();

    // loadInteractive is first posted to the iframe
    expect(nextToLastPost()).toBe("loadInteractive");
    expect(nextToLastPostData()).toStrictEqual({testing: true});

    // initInteractive is then posted to the iframe
    expect(lastPost()).toBe("initInteractive");

    // extract out dynamic bits
    const postData = lastPostData();
    const { externalReportUrl, objectStorageConfig } = postData;
    delete postData.externalReportUrl;
    delete postData.objectStorageConfig;

    expect(postData).toStrictEqual({
      activityName: undefined,
      attachments: {
        "test.mp3": {
          contentType: "audio/mp3",
        },
        "test.png": {
          contentType: "image/png",
        },
      },
      accessibility: {
        fontSize: "normal",
        fontSizeInPx: 16,
        fontType: "normal",
        fontFamilyForType: "'Lato', arial, helvetica, sans-serif;",
      },
      mediaLibrary: {
        enabled: false,
        items: [],
      },
      authInfo: {email: "", loggedIn: false, provider: ""},
      authoredState: null,
      classInfoUrl: "",
      collaboratorUrls: null,
      error: "",
      globalInteractiveState: null,
      hostFeatures: {
        getFirebaseJwt: {version: "1.0.0"}, modal: {alert: false, dialog: true, lightbox: true, version: "1.0.0"},
        questionGating: {version: "1.0.0"}, domain: "activity-player.unexisting.url.com"
      },
      interactive: {id: "123-Interactive", name: ""},
      interactiveState: {testing: true},
      interactiveStateUrl: "",
      linkedInteractives: [],
      mode: "runtime",
      pageName: undefined,
      pageNumber: undefined,
      runRemoteEndpoint: undefined,
      themeInfo: {colors: {colorA: "", colorB: ""}},
      updatedAt: undefined,
      version: 1,
    });

    expect(externalReportUrl).toBeDefined();

    expect(objectStorageConfig.user.runKey).toBeDefined();
    objectStorageConfig.app.apiKey = "obfuscated-api-key-for-tests";
    objectStorageConfig.user.runKey = "static-run-key-for-tests";
    expect(objectStorageConfig).toStrictEqual({
      app: {
        apiKey: "obfuscated-api-key-for-tests",
        appId: "1:402218300971:web:32b7266ef5226ff7",
        authDomain: "report-service-dev.firebaseapp.com",
        databaseURL: "https://report-service-dev.firebaseio.com",
        messagingSenderId: "402218300971",
        projectId: "report-service-dev",
        storageBucket: "report-service-dev.appspot.com",
      },
      questionId: "interactive_123",
      root: "sources/activity-player.unexisting.url.com",
      type: "firebase",
      user: {
        runKey: "static-run-key-for-tests",
        type: "anonymous",
      },
      version: 1,
    });

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

    const iframeEl = testIframe.getByTestId("iframe-runtime").querySelector("iframe");
    expect(iframeEl).not.toBeNull();
    // height is the default of 300px
    expect(iframeEl).toHaveAttribute("height", "300");

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

    mockGetFirebaseJWT.mockImplementation(() => Promise.reject(sessionExpiredError()));
    act(() => {
      dispatchMessageFromChild("getFirebaseJWT", {});
    });
    await Promise.resolve("foo");
    expect(lastPost()).toBe("firebaseJWT");
    expect(lastPostData().message).toBe(kSessionExpiredMessage);

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

  it("applies an active URL override to the iframe src (AP-115)", async () => {
    const registry: RegistryJson = {
      qi: {
        prefix: "https://models-resources.concord.org/question-interactives/",
        match: "(branch|version)/[^/]+/",
        replace: "branch/${value}/",
      },
    };
    resetOverridesForTesting();
    await initializeOverrides({
      fetchRegistry: async () => registry,
      getSearch: () => "?override.qi=toolbar-accessibility",
    });

    const rawUrl =
      "https://models-resources.concord.org/question-interactives/branch/master/image-question/index.html";
    const overriddenUrl =
      "https://models-resources.concord.org/question-interactives/branch/toolbar-accessibility/image-question/index.html";

    const noop = jest.fn();
    const testIframe = render(
      <MediaLibraryTester>
        <DynamicTextTester>
          <IframeRuntime
            url={rawUrl}
            id={"123-Interactive"}
            authoredState={null}
            initialInteractiveState={null}
            legacyLinkedInteractiveState={null}
            setInteractiveState={noop}
            setAspectRatio={noop}
            setHeightFromInteractive={noop}
            setSupportedFeatures={noop}
            setNewHint={noop}
            getFirebaseJWT={jest.fn(() => Promise.resolve("stub"))}
            getAttachmentUrl={jest.fn(() => Promise.resolve({ url: "", requestId: 1 }))}
            showModal={noop}
            closeModal={noop}
            setSendCustomMessage={noop}
            setNavigation={noop}
            log={noop}
            iframeTitle="Interactive content"
          />
        </DynamicTextTester>
      </MediaLibraryTester>
    );
    // allow the iframe-reload effect (which imperatively sets src) to run
    act(() => {
      jest.runAllTimers();
    });

    const iframe = testIframe.getByTestId("iframe-runtime").querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toBe(overriddenUrl);
    expect(iframe.getAttribute("src")).not.toBe(rawUrl);
  });

  it("blanks an unsupported scheme without opening an iframe-phone connection", () => {
    // iframe-phone derives its target origin from the iframe src and throws on
    // about:blank, which fails the render of the whole page.
    const { container } = renderWith({ url: "javascript:alert(1)" });
    act(() => { jest.runAllTimers(); });
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toBe("about:blank");
    expect(iframePhone.ParentEndpoint).not.toHaveBeenCalled();
  });

  it("resolves a state request for an interactive that never got a phone", async () => {
    // Nothing can answer a getInteractiveState post that was never sent, so without an
    // early return the request runs out its timeout and reports a save failure.
    const ref = React.createRef<IframeRuntimeImperativeAPI>();
    renderWith({ url: "javascript:alert(1)", ref });
    act(() => { jest.runAllTimers(); });
    const request = ref.current!.requestInteractiveState();
    act(() => { jest.runAllTimers(); });
    await expect(request).resolves.toBeUndefined();
  });

  it("loads an interactive embedded with a scheme-relative url", () => {
    // Older LARA content was authored with "//host/path", which the browser loads using
    // the scheme of the page it is on.
    const url = "//models-resources.concord.org/interactive/index.html";
    const { container } = renderWith({ url });
    act(() => { jest.runAllTimers(); });
    const iframe = container.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.getAttribute("src")).toBe(url);
  });

  describe("re-init after the interactive reloads its own page", () => {
    // iframe-phone calls the after-connected callback on every "hello", and an interactive
    // that reloads its own page says "hello" again without the runtime remounting.
    const helloAgain = () => {
      const [, afterConnectedCallback] = lastCall(iframePhone.ParentEndpoint as unknown as jest.Mock);
      act(() => { afterConnectedCallback(); });
    };
    const postsOf = (type: string) => mockPost.mock.calls.filter(([t]) => t === type).map(([, data]) => data);

    it("re-inits with the latest state the interactive sent", () => {
      renderWith({ initialInteractiveState: { run: 0 } });
      act(() => { jest.runAllTimers(); });
      act(() => { dispatchMessageFromChild("interactiveState", { run: 1 }); });
      mockPost.mockClear();

      helloAgain();

      expect(postsOf("initInteractive")).toHaveLength(1);
      expect(postsOf("initInteractive")[0].interactiveState).toStrictEqual({ run: 1 });
      expect(postsOf("loadInteractive")).toStrictEqual([{ run: 1 }]);
    });

    it("takes the parent's state when the url changes", () => {
      // the parent's state includes saves made elsewhere, such as in another tab
      const { rerender } = renderWith({ initialInteractiveState: { run: 0 } });
      act(() => { jest.runAllTimers(); });
      act(() => { dispatchMessageFromChild("interactiveState", { run: 1 }); });
      mockPost.mockClear();

      rerender(runtimeWith({ url: "https://concord.org/other", initialInteractiveState: { run: 2 } }));
      act(() => { jest.runAllTimers(); });

      expect(postsOf("initInteractive")).toHaveLength(1);
      expect(postsOf("initInteractive")[0].interactiveState).toStrictEqual({ run: 2 });
      expect(postsOf("loadInteractive")).toStrictEqual([{ run: 2 }]);
    });

    it("re-inits with no state after Clear & start over", () => {
      const setInteractiveState = jest.fn();
      const { getByTestId } = renderWith({
        initialInteractiveState: { run: 0 }, setInteractiveState, showDeleteDataButton: true
      });
      act(() => { jest.runAllTimers(); });
      act(() => { dispatchMessageFromChild("interactiveState", { run: 1 }); });
      mockPost.mockClear();

      act(() => { fireEvent.click(getByTestId("reset-button")); });
      act(() => { jest.runAllTimers(); });

      expect(postsOf("initInteractive")).toHaveLength(1);
      expect(postsOf("initInteractive")[0].interactiveState).toBeUndefined();
      expect(postsOf("loadInteractive")).toHaveLength(0);

      // the cleared state no longer counts as current, so sending it again saves it
      setInteractiveState.mockClear();
      act(() => { dispatchMessageFromChild("interactiveState", { run: 1 }); });
      expect(setInteractiveState).toHaveBeenCalledWith({ run: 1 });
    });

    it("never sends or saves a legacy \"nochange\" initial state", () => {
      const setInteractiveState = jest.fn();
      renderWith({ initialInteractiveState: "nochange", setInteractiveState });
      act(() => { jest.runAllTimers(); });
      helloAgain();

      const inits = postsOf("initInteractive");
      expect(inits).toHaveLength(2);
      inits.forEach(init => expect(init.interactiveState).toBeUndefined());
      expect(postsOf("loadInteractive")).toHaveLength(0);

      act(() => { dispatchMessageFromChild("interactiveState", "touch"); });
      expect(setInteractiveState).not.toHaveBeenCalled();
    });

    it("re-saves only the current state on \"touch\"", () => {
      const setInteractiveState = jest.fn();
      const { getByTestId } = renderWith({
        initialInteractiveState: { run: 0 }, setInteractiveState, showDeleteDataButton: true
      });
      act(() => { jest.runAllTimers(); });
      act(() => { dispatchMessageFromChild("interactiveState", { run: 1 }); });
      helloAgain();
      setInteractiveState.mockClear();

      act(() => { dispatchMessageFromChild("interactiveState", "touch"); });
      expect(setInteractiveState).toHaveBeenCalledTimes(1);
      expect(setInteractiveState).toHaveBeenCalledWith({ run: 1 });

      // after Clear & start over there is no current state for "touch" to bring back
      act(() => { fireEvent.click(getByTestId("reset-button")); });
      act(() => { jest.runAllTimers(); });
      setInteractiveState.mockClear();
      act(() => { dispatchMessageFromChild("interactiveState", "touch"); });
      expect(setInteractiveState).not.toHaveBeenCalled();
    });
  });

  describe("question gate events", () => {
    const connect = () => act(() => { jest.advanceTimersByTime(0); });
    const declare = () => act(() => { dispatchMessageFromChild("supportedFeatures", { features: { questionGating: true } }); });

    it("reports a declaration with the interactive's state", () => {
      const onQuestionGateEvent = jest.fn();
      renderWith({ onQuestionGateEvent });
      connect();
      declare();
      expect(onQuestionGateEvent.mock.calls).toEqual([[{ type: "declared", hasState: true }]]);
    });

    it("reports a declaration without state after Clear & start over", () => {
      const onQuestionGateEvent = jest.fn();
      const { getByTestId } = renderWith({ onQuestionGateEvent, showDeleteDataButton: true });
      connect();
      act(() => { fireEvent.click(getByTestId("reset-button")); });
      connect();
      declare();
      expect(onQuestionGateEvent.mock.calls).toEqual([[{ type: "declared", hasState: false }]]);
    });

    it("reports unlockQuestions", () => {
      const onQuestionGateEvent = jest.fn();
      renderWith({ onQuestionGateEvent });
      connect();
      act(() => { dispatchMessageFromChild("unlockQuestions", { restored: true }); });
      expect(onQuestionGateEvent.mock.calls).toEqual([[{ type: "unlocked", restored: true }]]);
    });

    const expectWindowToEndIn = (onQuestionGateEvent: jest.Mock, ms: number) => {
      act(() => { jest.advanceTimersByTime(ms - 1); });
      expect(onQuestionGateEvent).not.toHaveBeenCalled();
      act(() => { jest.advanceTimersByTime(1); });
      expect(onQuestionGateEvent.mock.calls).toEqual([[{ type: "declarationWindowEnded" }]]);
    };

    it("restarts the declaration window on the iframe's load event", () => {
      const onQuestionGateEvent = jest.fn();
      const { container } = renderWith({ onQuestionGateEvent });
      connect();
      act(() => { jest.advanceTimersByTime(3000); });
      fireEvent.load(container.querySelector("iframe") as HTMLIFrameElement);
      expectWindowToEndIn(onQuestionGateEvent, 5000);
    });

    it("restarts the declaration window on each initInteractive", () => {
      const onQuestionGateEvent = jest.fn();
      renderWith({ onQuestionGateEvent });
      connect();
      act(() => { jest.advanceTimersByTime(3000); });
      const [, afterConnectedCallback] = lastCall(iframePhone.ParentEndpoint as unknown as jest.Mock);
      act(() => { afterConnectedCallback(); });
      expectWindowToEndIn(onQuestionGateEvent, 5000);
    });

    it("ignores the gate messages without onQuestionGateEvent", () => {
      renderWith();
      connect();
      expect(() => {
        declare();
        act(() => { dispatchMessageFromChild("unlockQuestions", {}); });
        act(() => { jest.advanceTimersByTime(10000); });
      }).not.toThrow();
    });
  });

  describe("focus transport", () => {
    it("calls onFocusTransportReady with a transport when the phone is built", () => {
      const onFocusTransportReady = jest.fn();
      renderWith({ onFocusTransportReady });
      expect(onFocusTransportReady).toHaveBeenCalled();
      const transport = onFocusTransportReady.mock.calls[0][0];
      expect(typeof transport.send).toBe("function");
      expect(typeof transport.onMessage).toBe("function");
    });

    it("destroys the FocusManager and clears the transport on unmount", () => {
      const onFocusTransportReady = jest.fn();
      const { unmount } = renderWith({ onFocusTransportReady });
      mockRemoveListener.mockClear();
      onFocusTransportReady.mockClear();
      unmount();
      // destroy() removes the listeners the FocusManager added to the phone
      expect(mockRemoveListener).toHaveBeenCalled();
      // teardown surfaces an undefined transport
      expect(onFocusTransportReady).toHaveBeenCalledWith(undefined);
    });

    it("surfaces the interactive's focusProtocol capability through the transport", () => {
      // iframe-phone keeps a single handler per message type, so iframe-runtime's
      // own "supportedFeatures" listener and the FocusManager's must not clobber
      // each other. When the interactive reports focusProtocol, a transport
      // subscriber must receive the capability — otherwise the cooperating dialog
      // never learns the interactive cooperates and falls back to the sentinel.
      const onFocusTransportReady = jest.fn();
      renderWith({ onFocusTransportReady });
      // Let the phone connect so initInteractive registers its listeners.
      act(() => { jest.runAllTimers(); });

      const transport = onFocusTransportReady.mock.calls[0][0];
      const received: any[] = [];
      transport.onMessage((m: any) => received.push(m));

      act(() => {
        dispatchMessageFromChild("supportedFeatures", { features: { focusProtocol: true } });
      });

      expect(received).toContainEqual({ type: "capability", focusProtocol: true });
    });

    it("builds the transport even when no callback is provided (inline case)", () => {
      // FocusManager is built unconditionally; the callback is only the (optional)
      // way to surface its transport. Prove construction happened by the FocusManager
      // registering its "focusExit" listener on the phone — iframe-runtime never
      // registers "focusExit" itself.
      expect(() => renderWith()).not.toThrow();
      expect(mockAddListener).toHaveBeenCalledWith("focusExit", expect.any(Function));
    });
  });
});

describe("IframeRuntime object storage token", () => {
  const authenticatedPortalData: any = {
    type: "authenticated",
    contextId: "class-hash",
    platformId: "https://portal",
    platformUserId: "7",
    resourceLinkId: "3",
    offering: { id: 3, activityUrl: "", rubricUrl: "", locked: false },
    runRemoteEndpoint: "https://portal/learners/5",
    database: { appName: "report-service-dev", sourceKey: "source", rawFirebaseJWT: "launch-jwt" }
  };
  const renderRuntime = () => render(
    <MediaLibraryTester>
      <DynamicTextTester>
        <IframeRuntime
          url={"https://concord.org/"}
          id={"123-Interactive"}
          authoredState={null}
          initialInteractiveState={null}
          legacyLinkedInteractiveState={null}
          setInteractiveState={jest.fn()}
          setAspectRatio={jest.fn()}
          setHeightFromInteractive={jest.fn()}
          setSupportedFeatures={jest.fn()}
          setNewHint={jest.fn()}
          getFirebaseJWT={jest.fn()}
          getAttachmentUrl={jest.fn()}
          showModal={jest.fn()}
          closeModal={jest.fn()}
          setSendCustomMessage={jest.fn()}
          log={jest.fn()}
          iframeTitle="Interactive content"
          portalData={authenticatedPortalData}
        />
      </DynamicTextTester>
    </MediaLibraryTester>
  );
  const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };

  beforeEach(() => {
    jest.useFakeTimers();
    mockPost.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  const launchJWT = jwt.sign({ iat: 1_000_000, exp: 1_000_000 + 3600 }, "secret");

  it("sends the current object storage token, not the launch token", async () => {
    const mint = jest.fn().mockResolvedValue("fresh-jwt");
    let clock = 0;
    initializeObjectStorageJWT({ rawFirebaseJWT: launchJWT, mint, now: () => clock });
    // past 80% of the launch token's hour, so it is stale on first use
    clock = 48 * 60 * 1000;
    renderRuntime();
    jest.runAllTimers();
    await act(flush);
    expect(mint).toHaveBeenCalledTimes(1);
    expect(lastPost()).toBe("initInteractive");
    expect(lastPostData().objectStorageConfig.user.jwt).toBe("fresh-jwt");
  });

  it("starts with the held token when no current one can be had", async () => {
    const mint = jest.fn().mockRejectedValue("Timeout of 10000ms exceeded");
    let clock = 0;
    initializeObjectStorageJWT({ rawFirebaseJWT: launchJWT, mint, now: () => clock });
    clock = 2 * 60 * 60 * 1000;
    renderRuntime();
    jest.runAllTimers();
    await act(flush);
    expect(mint).toHaveBeenCalledTimes(1);
    expect(lastPost()).toBe("initInteractive");
    expect(lastPostData().objectStorageConfig.user.jwt).toBe(launchJWT);
  });

  it("sends state that arrives while the token is pending", async () => {
    let resolve!: (jwt: string) => void;
    let clock = 0;
    initializeObjectStorageJWT({ rawFirebaseJWT: launchJWT, mint: () => new Promise(r => { resolve = r; }), now: () => clock });
    clock = 48 * 60 * 1000;
    renderRuntime();
    jest.runAllTimers();
    act(() => { dispatchMessageFromChild("interactiveState", { run: 1 }); });
    resolve("fresh-jwt");
    await act(flush);

    const posts = (type: string) => mockPost.mock.calls.filter(([t]) => t === type).map(([, data]) => data);
    expect(posts("loadInteractive")).toStrictEqual([{ run: 1 }]);
    expect(posts("initInteractive")).toHaveLength(1);
    expect(posts("initInteractive")[0].interactiveState).toStrictEqual({ run: 1 });
  });

  it("does not post initInteractive after unmounting while the token is pending", async () => {
    let resolve!: (jwt: string) => void;
    let clock = 0;
    initializeObjectStorageJWT({ rawFirebaseJWT: launchJWT, mint: () => new Promise(r => { resolve = r; }), now: () => clock });
    clock = 48 * 60 * 1000;
    const view = renderRuntime();
    jest.runAllTimers();
    view.unmount();
    resolve("fresh-jwt");
    await act(flush);
    expect(mockPost.mock.calls.map(c => c[0])).not.toContain("initInteractive");
  });
});

