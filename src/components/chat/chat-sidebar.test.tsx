import React from "react";
import { act, configure, fireEvent, render, screen } from "@testing-library/react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatIdentity } from "./chat-eligibility";
import { getChatLogSink } from "./chat-log-forwarder";
import { Activity } from "../../types";
import { getVisiblePages } from "../../utilities/page-walk";
import _activity from "../../data/version-2/sample-new-sections-activity-1.json";

configure({ testIdAttribute: "data-cy" });

const activity = _activity as unknown as Activity;
const page = getVisiblePages(activity)[1];
// No activityUrl → the sidebar uses the no-backend DebugTransport (no Firebase in these tests).
const identity: ChatIdentity = { source: "s", key: "k", ownerFields: { run_key: "k" } };

const renderSidebar = (fullWidth: boolean) =>
  render(
    <ChatSidebar
      fullWidth={fullWidth}
      activity={activity}
      page={page}
      hints={{ activityTitle: activity.name, pageNumber: 2, pageCount: 5 }}
      identity={identity}
    />
  );

const openChat = () => act(() => { fireEvent.click(screen.getByTestId("chat-launcher")); });

describe("ChatSidebar", () => {
  afterEach(() => {
    document.body.classList.remove("ap-chat-open", "ap-chat-push-open");
  });

  it("starts closed with an accessible launcher", () => {
    renderSidebar(true);
    const launcher = screen.getByTestId("chat-launcher");
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("chat-sidebar")).toBeNull();
  });

  it("opens the panel and shows the tutor header", () => {
    renderSidebar(true);
    openChat();
    expect(screen.getByTestId("chat-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("chat-header")).toHaveTextContent("Ask the Tutor");
  });

  // A responsive (fullWidth) activity gets PUSH: the activity reflows to make room, driven by the
  // ap-chat-push-open body class. This path was unreachable while kForceOverlay was set, so it had no
  // coverage at all.
  it("uses push mode for a responsive activity and reflows the activity", () => {
    renderSidebar(true);
    expect(screen.getByTestId("chat-launcher")).toHaveClass("push");
    openChat();
    expect(screen.getByTestId("chat-sidebar")).toHaveClass("push");
    expect(document.body.classList.contains("ap-chat-open")).toBe(true);
    expect(document.body.classList.contains("ap-chat-push-open")).toBe(true);
  });

  // A fixed-width activity gets OVERLAY: the drawer floats over the page and the activity is never
  // narrowed (that would break its fixed-width interactives).
  it("uses overlay mode for a fixed-width activity and never reflows the activity", () => {
    renderSidebar(false);
    expect(screen.getByTestId("chat-launcher")).toHaveClass("overlay");
    openChat();
    expect(screen.getByTestId("chat-sidebar")).toHaveClass("overlay");
    // still offsets AP's fixed right-edge UI...
    expect(document.body.classList.contains("ap-chat-open")).toBe(true);
    // ...but does not reflow the activity itself
    expect(document.body.classList.contains("ap-chat-push-open")).toBe(false);
  });

  it("drops the reflow body classes when the chat closes", () => {
    renderSidebar(true);
    openChat();
    expect(document.body.classList.contains("ap-chat-open")).toBe(true);
    act(() => { fireEvent.click(screen.getByTestId("chat-close")); });
    expect(document.body.classList.contains("ap-chat-open")).toBe(false);
    expect(document.body.classList.contains("ap-chat-push-open")).toBe(false);
  });

  it("closes the drawer on Escape", () => {
    renderSidebar(false);
    openChat();
    expect(screen.getByTestId("chat-sidebar")).toBeInTheDocument();
    act(() => { fireEvent.keyDown(screen.getByTestId("chat-input"), { key: "Escape" }); });
    expect(screen.queryByTestId("chat-sidebar")).toBeNull();
    expect(screen.getByTestId("chat-launcher")).toBeInTheDocument();
  });

  // Forwarding interactive logs while the panel is CLOSED wrote a Firestore doc and billed an OpenAI
  // turn per log for a conversation nobody was reading — and the panel re-closes on every page nav.
  it("registers the log sink only while the panel is open", () => {
    renderSidebar(false);
    expect(getChatLogSink()).toBeNull();

    openChat();
    expect(getChatLogSink()).not.toBeNull();

    act(() => { fireEvent.click(screen.getByTestId("chat-close")); });
    expect(getChatLogSink()).toBeNull();
  });
});
