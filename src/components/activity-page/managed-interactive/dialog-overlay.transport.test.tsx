import React from "react";
import { render } from "@testing-library/react";
import Modal from "react-modal";

// Capture the options passed to useIframeSlot; stub the hooks so this test is
// isolated from the real focus-trap behavior (covered in dialog-overlay.test.tsx).
const mockUseIframeSlot = jest.fn((_opts: any) => ({
  strategyFragment: {
    contentSlot: "content",
    nativeTabSlots: [],
    focusContent: jest.fn(),
    getNativeTabSlotSentinels: () => ({ before: null, after: null }),
  },
  beforeSentinelProps: { ref: jest.fn() },
  afterSentinelProps: { ref: jest.fn() },
}));
const mockTrap = {
  containerRef: jest.fn(),
  enterTrap: jest.fn(),
  cycleToAdjacentSlot: jest.fn(),
};
jest.mock("@concord-consortium/accessibility-tools/hooks", () => ({
  useIframeSlot: (opts: any) => mockUseIframeSlot(opts),
  useFocusTrap: () => mockTrap,
}));

// The mocked IframeRuntime surfaces a known transport via onFocusTransportReady.
const fakeTransport = { send: jest.fn(), onMessage: jest.fn(() => jest.fn()) };
jest.mock("./iframe-runtime", () => ({
  IframeRuntime: React.forwardRef<HTMLDivElement, any>(function MockedIframeRuntime(props) {
    React.useEffect(() => {
      props.onFocusTransportReady?.(fakeTransport);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return <div data-cy="iframe-runtime-mock" />;
  }),
}));

import { DialogOverlay } from "./dialog-overlay";

const baseProps = {
  url: "https://example.com/interactive",
  onClose: jest.fn(),
  iframeRuntimeProps: {} as any,
};

describe("DialogOverlay transport wiring", () => {
  beforeAll(() => {
    const root = document.createElement("div");
    root.setAttribute("id", "app");
    document.body.appendChild(root);
    Modal.setAppElement("#app");
  });

  beforeEach(() => {
    mockUseIframeSlot.mockClear();
  });

  it("forwards the IframeRuntime transport into useIframeSlot", async () => {
    render(<DialogOverlay {...baseProps} />);
    // Let the mocked IframeRuntime's effect run -> setTransport -> re-render.
    await Promise.resolve();
    const lastOpts = mockUseIframeSlot.mock.calls[mockUseIframeSlot.mock.calls.length - 1][0];
    expect(lastOpts.transport).toBe(fakeTransport);
  });

  it("calls useIframeSlot with no transport before the runtime reports one", () => {
    render(<DialogOverlay {...baseProps} />);
    // First render (synchronous, before the effect runs) has no transport yet.
    expect(mockUseIframeSlot.mock.calls[0][0].transport).toBeUndefined();
  });
});
