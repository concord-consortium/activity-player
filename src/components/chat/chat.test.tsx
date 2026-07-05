import React from "react";
import { act, configure, fireEvent, render, screen } from "@testing-library/react";
import { Chat } from "./chat";
import { UseChatResult } from "./use-chat";
import { ChatTurn } from "./transport";

configure({ testIdAttribute: "data-cy" });

const makeChat = (overrides: Partial<UseChatResult> = {}): UseChatResult => ({
  turns: [],
  status: "idle",
  error: null,
  pending: false,
  sendMessage: jest.fn().mockResolvedValue(undefined),
  header: "Chat about: Page 2 — Photosynthesis",
  ...overrides,
});

describe("Chat component", () => {
  it("renders the page-scope header and empty state", () => {
    render(<Chat chat={makeChat()} />);
    expect(screen.getByTestId("chat-header")).toHaveTextContent("Chat about: Page 2 — Photosynthesis");
    expect(screen.getByTestId("chat-empty")).toBeInTheDocument();
  });

  it("renders turns with per-turn sender attribution in the DOM", () => {
    const turns: ChatTurn[] = [
      { id: "u1", sender: "user", text: "What is this?" },
      { id: "a1", sender: "assistant", text: "Let's think about it." },
    ];
    render(<Chat chat={makeChat({ turns })} />);
    expect(screen.getByTestId("chat-row-user")).toHaveTextContent("You said:");
    expect(screen.getByTestId("chat-row-user")).toHaveTextContent("What is this?");
    expect(screen.getByTestId("chat-row-assistant")).toHaveTextContent("Tutor said:");
    expect(screen.getByTestId("chat-row-assistant")).toHaveTextContent("Let's think about it.");
  });

  it("renders a debug turn as a diagnostic panel (collapsed by default) toggleable open, and excludes it from the live region", () => {
    const turns: ChatTurn[] = [
      { id: "d1", sender: "assistant", text: "would forward log: {}", variant: "debug" },
    ];
    render(<Chat chat={makeChat({ turns, pending: false })} />);
    const debug = screen.getByTestId("chat-row-debug");
    expect(debug).toHaveAttribute("role", "note");
    // body is hidden by default; the label is a collapsed toggle
    const toggle = screen.getByTestId("chat-debug-toggle");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("chat-debug-body")).not.toBeInTheDocument();
    // toggling reveals the content
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("chat-debug-body")).toHaveTextContent("would forward log:");
    // not attributed as a tutor bubble and not announced
    expect(screen.queryByTestId("chat-row-assistant")).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-live")).toHaveTextContent("");
  });

  it("copies the full debug content to the clipboard from the title bar", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const turns: ChatTurn[] = [
      { id: "d1", sender: "assistant", variant: "debug", text: "full copyable text",
        debugSegments: [{ kind: "note", text: "wrapper" }, { kind: "payload", text: "SENT TO SERVER" }] },
    ];
    render(<Chat chat={makeChat({ turns })} />);
    const copy = screen.getByTestId("chat-debug-copy");
    expect(copy).toHaveAttribute("aria-label", "Copy debug content");
    await act(async () => { fireEvent.click(copy); });
    expect(writeText).toHaveBeenCalledWith("full copyable text");
    expect(copy).toHaveAttribute("aria-label", "Copied");
  });

  it("renders debug segments with the server-bound payload distinct from the wrapper note", () => {
    const turns: ChatTurn[] = [
      { id: "d1", sender: "assistant", variant: "debug", text: "wrapper\n\nSENT TO SERVER",
        debugSegments: [{ kind: "note", text: "wrapper" }, { kind: "payload", text: "SENT TO SERVER" }] },
    ];
    render(<Chat chat={makeChat({ turns })} />);
    fireEvent.click(screen.getByTestId("chat-debug-toggle"));
    const body = screen.getByTestId("chat-debug-body");
    expect(body.querySelector(".chat-debug-seg.note")).toHaveTextContent("wrapper");
    expect(body.querySelector(".chat-debug-seg.payload")).toHaveTextContent("SENT TO SERVER");
  });

  it("exposes the typing indicator to assistive tech when pending", () => {
    render(<Chat chat={makeChat({ pending: true })} />);
    const typing = screen.getByTestId("chat-typing");
    expect(typing).toHaveAttribute("role", "status");
    expect(typing).toHaveAttribute("aria-label", "Tutor is typing");
  });

  it("announces the completed assistant reply via a polite live region", () => {
    const turns: ChatTurn[] = [{ id: "a1", sender: "assistant", text: "Here is a hint." }];
    render(<Chat chat={makeChat({ turns, pending: false })} />);
    const live = screen.getByTestId("chat-live");
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveTextContent("Tutor said: Here is a hint.");
  });

  it("surfaces an error row instead of spinning forever", () => {
    render(<Chat chat={makeChat({ status: "error", error: "The tutor is currently unavailable. Please try again." })} />);
    const err = screen.getByTestId("chat-error");
    expect(err).toHaveAttribute("role", "alert");
    expect(err).toHaveTextContent("unavailable");
  });

  it("has a labeled composer and an accessible send button that is disabled when empty", () => {
    render(<Chat chat={makeChat()} />);
    expect(screen.getByLabelText("Message the tutor")).toBe(screen.getByTestId("chat-input"));
    expect(screen.getByTestId("chat-send")).toBeDisabled();
  });

  it("sends a message, clears the input, and calls sendMessage", async () => {
    const sendMessage = jest.fn().mockResolvedValue(undefined);
    render(<Chat chat={makeChat({ sendMessage })} />);
    const input = screen.getByTestId("chat-input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "hello" } });
    expect(screen.getByTestId("chat-send")).not.toBeDisabled();
    await act(async () => {
      fireEvent.submit(screen.getByTestId("chat-composer"));
    });
    expect(sendMessage).toHaveBeenCalledWith("hello");
    expect(input.value).toBe("");
  });

  it("renders a labeled close control when onClose is provided", () => {
    const onClose = jest.fn();
    render(<Chat chat={makeChat()} onClose={onClose} closeLabel="Collapse chat" />);
    const close = screen.getByTestId("chat-close");
    expect(close).toHaveAttribute("aria-label", "Collapse chat");
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalled();
  });
});
