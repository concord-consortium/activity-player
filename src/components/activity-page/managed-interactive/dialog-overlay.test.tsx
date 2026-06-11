import React from "react";
import { configure, fireEvent, render, screen } from "@testing-library/react";
import { DialogOverlay } from "./dialog-overlay";

configure({ testIdAttribute: "data-cy" });

// react-modal needs an app element configured for tests.
import Modal from "react-modal";

jest.mock("./iframe-runtime", () => ({
  IframeRuntime: React.forwardRef((_: any, _ref: any) => <div data-cy="iframe-runtime-mock" />),
}));

const baseProps = {
  url: "https://example.com/interactive",
  onClose: jest.fn(),
  iframeRuntimeProps: {} as any,    // skeleton-test only — Task 5 fills this in
};

describe("DialogOverlay component", () => {
  beforeAll(() => {
    // Provide a DOM root for react-modal's portal.
    const root = document.createElement("div");
    root.setAttribute("id", "app");
    document.body.appendChild(root);
    Modal.setAppElement("#app");
  });

  beforeEach(() => {
    baseProps.onClose = jest.fn();
  });

  it("renders a close button when not notCloseable", () => {
    render(<DialogOverlay {...baseProps} />);
    expect(screen.getByTestId("dialog-overlay-close")).toBeInTheDocument();
  });

  it("does not render a close button when notCloseable", () => {
    render(<DialogOverlay {...baseProps} notCloseable />);
    expect(screen.queryByTestId("dialog-overlay-close")).toBeNull();
  });

  it("calls onClose when the close button is clicked", () => {
    render(<DialogOverlay {...baseProps} />);
    fireEvent.click(screen.getByTestId("dialog-overlay-close"));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose at most once even on repeated dismiss clicks", () => {
    render(<DialogOverlay {...baseProps} />);
    const btn = screen.getByTestId("dialog-overlay-close");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("focuses the close button on mount when not notCloseable", async () => {
    render(<DialogOverlay {...baseProps} />);
    // yield once for React commit microtasks.
    await Promise.resolve();
    expect(document.activeElement).toBe(screen.getByTestId("dialog-overlay-close"));
  });

  it("dismisses the dialog when Escape is pressed on the close button", async () => {
    render(<DialogOverlay {...baseProps} />);
    await Promise.resolve();
    const btn = screen.getByTestId("dialog-overlay-close");
    fireEvent.keyDown(btn, { key: "Escape" });
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});
