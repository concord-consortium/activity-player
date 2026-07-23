import {
  buildForwardedLog,
  forwardInteractiveLog,
  registerChatLogSink,
  unregisterChatLogSink,
  getChatLogSink,
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
  afterEach(() => {
    const s = getChatLogSink();
    if (s) unregisterChatLogSink(s);
  });

  it("forwards a built payload to the registered sink", () => {
    const forwarded: ChatLogPayload[] = [];
    const sink = { forwardLog: (p: ChatLogPayload) => forwarded.push(p) };
    registerChatLogSink(sink);
    forwardInteractiveLog({
      logData: { action: "did thing", value: 1 },
      interactiveId: "int-2",
      interactiveUrl: "https://flood.concord.org/",
    });
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0].action).toBe("did thing");
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
