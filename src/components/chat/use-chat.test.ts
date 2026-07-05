import { act, renderHook } from "@testing-library/react-hooks";
import { useChat } from "./use-chat";
import { ChatStatus, ChatTransport, DebugTransport } from "./transport";
import { Activity } from "../../types";
import { getVisiblePages } from "../../utilities/page-walk";
import _activity from "../../data/version-2/sample-new-sections-activity-1.json";

const activity = _activity as unknown as Activity;
const page = getVisiblePages(activity)[1];

describe("useChat with DebugTransport", () => {
  it("seeds the debug page system prompt up front (no send needed) and echoes on send", async () => {
    const transport = new DebugTransport({ activity, page });
    const { result } = renderHook(() => useChat({ transport, header: "Chat about: Page 2" }));

    // the page prompt is present immediately — so it shows on open, including right after a page change
    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0].sender).toBe("assistant");
    expect(result.current.turns[0].variant).toBe("debug");
    // the REAL client-derived page context is shown, bracketed by placeholders for the two server-only
    // pieces (generic prompt + sim map) — the removed AP tutor-prompt body is no longer duplicated here
    expect(result.current.turns[0].text).toContain("Page 2 of");            // real page context
    expect(result.current.turns[0].text).toContain("generic tutor prompt"); // [1] server-only placeholder
    expect(result.current.turns[0].text).toContain("per-sim prompt");       // [3] server-only placeholder
    expect(result.current.turns[0].text).not.toContain("Never reveal answers"); // server-owned, not client-side
    expect(result.current.header).toBe("Chat about: Page 2");

    await act(async () => { await result.current.sendMessage("hello tutor"); });

    expect(result.current.turns).toHaveLength(3);
    expect(result.current.turns[1]).toMatchObject({ sender: "user", text: "hello tutor" });
    expect(result.current.turns[2].sender).toBe("assistant");
    expect(result.current.status).toBe("idle");
    expect(result.current.pending).toBe(false);
  });

  it("ignores empty/whitespace messages (leaving only the seeded prompt)", async () => {
    const transport = new DebugTransport({ activity, page });
    const { result } = renderHook(() => useChat({ transport, header: "h" }));
    await act(async () => { await result.current.sendMessage("   "); });
    expect(result.current.turns).toHaveLength(1);
    expect(result.current.turns[0].variant).toBe("debug");
  });

  it("drives the pending indicator from the (effective) status", () => {
    let emitStatus: (s: ChatStatus) => void = () => undefined;
    const transport: ChatTransport = {
      subscribe: (onTurns, onStatus) => {
        emitStatus = onStatus;
        onTurns([]); onStatus("idle");
        return () => undefined;
      },
      sendUserMessage: async () => undefined,
    };
    const { result } = renderHook(() => useChat({ transport, header: "h" }));
    expect(result.current.pending).toBe(false);

    act(() => { emitStatus("generating"); });
    expect(result.current.pending).toBe(true);

    // a silent (userText:null) reply returns the effective status to idle → indicator clears
    act(() => { emitStatus("idle"); });
    expect(result.current.pending).toBe(false);

    act(() => { emitStatus("error"); });
    expect(result.current.pending).toBe(false);
  });

  it("surfaces an error when status becomes error", () => {
    let emitStatus: (s: ChatStatus) => void = () => undefined;
    const transport: ChatTransport = {
      subscribe: (onTurns, onStatus) => { emitStatus = onStatus; onTurns([]); onStatus("idle"); return () => undefined; },
      sendUserMessage: async () => undefined,
    };
    const { result } = renderHook(() => useChat({ transport, header: "h" }));
    expect(result.current.error).toBeNull();
    act(() => { emitStatus("error"); });
    expect(result.current.error).toContain("unavailable");
  });
});
