import {
  buildForwardedLog,
  forwardInteractiveLog,
  registerChatLogSink,
  unregisterChatLogSink,
  getChatLogSink,
  kLogCoalesceMs,
  ChatLogPayload,
} from "./chat-log-forwarder";

describe("buildForwardedLog", () => {
  const base = { interactiveId: "int-1", interactiveUrl: "https://wildfire.concord.org/branch/master/" };

  it("drops mouse-move/-button spam", () => {
    expect(buildForwardedLog({ ...base, logData: { action: "mousemove" } })).toBeNull();
    expect(buildForwardedLog({ ...base, logData: { action: "mousedown" } })).toBeNull();
  });

  it("drops logs with no action", () => {
    expect(buildForwardedLog({ ...base, logData: {} })).toBeNull();
  });

  it("drops viewport-visibility telemetry (scrolled into/out of view)", () => {
    expect(buildForwardedLog({ ...base, logData: { action: "scrolled into view" } })).toBeNull();
    expect(buildForwardedLog({ ...base, logData: { action: "scrolled out of view" } })).toBeNull();
  });

  it("keeps a meaningful domain action that merely contains 'scroll' (not an exact visibility match)", () => {
    const payload = buildForwardedLog({ ...base, logData: { action: "SliderScrolled", value: 5 } });
    expect(payload?.action).toBe("SliderScrolled");
  });

  it("builds a payload for a normal log", () => {
    const payload = buildForwardedLog({ ...base, logData: { action: "changed model", value: 3, data: { a: 1 } } });
    expect(payload).toEqual({
      interactive_id: "int-1",
      interactive_url: "https://wildfire.concord.org/branch/master/",
      action: "changed model",
      value: 3,
      data: { a: 1 },
    });
  });

  it("enriches a multiple-choice selection with the human label", () => {
    const authoredState = { choices: [{ id: "1", content: "No change" }, { id: "2", content: "Overall increase" }] };
    const payload = buildForwardedLog({
      ...base,
      logData: { action: "submit answer", data: { target_name: "answer", target_value: "2" } },
      authoredState,
    });
    expect((payload?.data as any).target_label).toBe("Overall increase");
    // opaque id is preserved alongside the label
    expect((payload?.data as any).target_value).toBe("2");
  });

  it("leaves the payload unenriched when the choice can't be mapped", () => {
    const authoredState = { choices: [{ id: "1", content: "No change" }] };
    const payload = buildForwardedLog({
      ...base,
      logData: { action: "submit answer", data: { target_name: "answer", target_value: "99" } },
      authoredState,
    });
    expect((payload?.data as any).target_label).toBeUndefined();
  });
});

describe("chat log sink registry", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    const s = getChatLogSink();
    if (s) unregisterChatLogSink(s);
    jest.useRealTimers();
  });

  const logOnce = (action: string, value?: unknown, interactiveId = "int-2") =>
    forwardInteractiveLog({
      logData: { action, value },
      interactiveId,
      interactiveUrl: "https://flood.concord.org/",
    });

  it("forwards a built payload to the registered sink once the coalesce window closes", () => {
    const forwarded: ChatLogPayload[] = [];
    registerChatLogSink({ forwardLog: (p: ChatLogPayload) => forwarded.push(p) });
    logOnce("did thing", 1);
    // nothing written yet — the window is still open
    expect(forwarded).toHaveLength(0);
    jest.advanceTimersByTime(kLogCoalesceMs);
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0].action).toBe("did thing");
  });

  // Every forwarded log is a Firestore write plus a report-service function invocation that bills its
  // own tutor turn, so a burst (a slider dragged across its range) must collapse to one doc.
  it("coalesces a burst of the same action into a single forward carrying the latest value", () => {
    const forwarded: ChatLogPayload[] = [];
    registerChatLogSink({ forwardLog: (p: ChatLogPayload) => forwarded.push(p) });
    logOnce("changed model", 1);
    jest.advanceTimersByTime(kLogCoalesceMs / 3);
    logOnce("changed model", 2);
    jest.advanceTimersByTime(kLogCoalesceMs / 3);
    logOnce("changed model", 3);
    // the window runs from the FIRST log and is not pushed out by later ones, so a continuous stream
    // still flushes on schedule rather than starving
    jest.advanceTimersByTime(kLogCoalesceMs);
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0].value).toBe(3);
  });

  it("keeps two genuinely different actions from the same interactive", () => {
    const forwarded: ChatLogPayload[] = [];
    registerChatLogSink({ forwardLog: (p: ChatLogPayload) => forwarded.push(p) });
    logOnce("changed model", 1);
    logOnce("submit answer", "b");
    jest.advanceTimersByTime(kLogCoalesceMs);
    expect(forwarded.map(p => p.action).sort()).toEqual(["changed model", "submit answer"]);
  });

  it("starts a fresh window after the previous one flushes", () => {
    const forwarded: ChatLogPayload[] = [];
    registerChatLogSink({ forwardLog: (p: ChatLogPayload) => forwarded.push(p) });
    logOnce("changed model", 1);
    jest.advanceTimersByTime(kLogCoalesceMs);
    logOnce("changed model", 2);
    jest.advanceTimersByTime(kLogCoalesceMs);
    expect(forwarded.map(p => p.value)).toEqual([1, 2]);
  });

  // A queued payload belongs to the conversation that was active when it was built. Closing the panel
  // (or navigating pages) must drop it rather than land it in the next conversation.
  it("discards a pending log when the sink is unregistered", () => {
    const sink = { forwardLog: jest.fn() };
    registerChatLogSink(sink);
    logOnce("did thing", 1);
    unregisterChatLogSink(sink);
    jest.advanceTimersByTime(kLogCoalesceMs);
    expect(sink.forwardLog).not.toHaveBeenCalled();
  });

  it("is a no-op when no sink is registered", () => {
    expect(() =>
      forwardInteractiveLog({ logData: { action: "x" }, interactiveId: "i", interactiveUrl: "u" })
    ).not.toThrow();
  });

  it("unregister only clears when the caller is the active sink", () => {
    const sinkA = { forwardLog: jest.fn() };
    const sinkB = { forwardLog: jest.fn() };
    registerChatLogSink(sinkA);
    registerChatLogSink(sinkB); // B is now active
    unregisterChatLogSink(sinkA); // stale unregister should not clear B
    expect(getChatLogSink()).toBe(sinkB);
  });
});
