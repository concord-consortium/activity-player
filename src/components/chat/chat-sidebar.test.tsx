import React from "react";
import { act, configure, fireEvent, render, screen } from "@testing-library/react";
import { ChatSidebar } from "./chat-sidebar";
import { ChatIdentity } from "./chat-eligibility";
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
      pageNumber={2}
      hints={{ activityTitle: activity.name }}
      identity={identity}
    />
  );

describe("ChatSidebar", () => {
  afterEach(() => {
    document.body.classList.remove("ap-chat-push-open");
  });

  it("starts closed with an accessible launcher", () => {
    renderSidebar(true);
    const launcher = screen.getByTestId("chat-launcher");
    expect(launcher).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByTestId("chat-sidebar")).toBeNull();
  });

  it("opens the panel and shows the tutor header", () => {
    renderSidebar(true);
    act(() => { fireEvent.click(screen.getByTestId("chat-launcher")); });
    expect(screen.getByTestId("chat-sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("chat-header")).toHaveTextContent("Ask the Tutor");
  });

  // Push/reflow mode is temporarily forced off (kForceOverlay) — every activity uses the overlay
  // drawer and never reflows the activity, even a responsive (fullWidth) one.
  it("uses the overlay drawer and never reflows the activity while push is forced off", () => {
    renderSidebar(true); // responsive activity
    expect(screen.getByTestId("chat-launcher")).toHaveClass("overlay");
    act(() => { fireEvent.click(screen.getByTestId("chat-launcher")); });
    expect(screen.getByTestId("chat-sidebar")).toHaveClass("overlay");
    expect(document.body.classList.contains("ap-chat-push-open")).toBe(false);
  });

  it("uses the overlay drawer for a fixed-width activity too", () => {
    renderSidebar(false);
    expect(screen.getByTestId("chat-launcher")).toHaveClass("overlay");
    act(() => { fireEvent.click(screen.getByTestId("chat-launcher")); });
    expect(screen.getByTestId("chat-sidebar")).toHaveClass("overlay");
    expect(document.body.classList.contains("ap-chat-push-open")).toBe(false);
  });
});
