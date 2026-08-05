import {
  FirestoreTransport, kMaxResubscribeAttempts, kResubscribeBaseMs, kReplyTimeoutMs,
} from "./transport-firestore";
import { ChatStatus, ChatTurn } from "./transport";

// Fakes for the firebase-db chat helpers so we can assert reads/writes without a real Firestore.
const messageAdds: any[] = [];
let parentExists = false;
const parentSet = jest.fn(async (data: any) => { parentSetData = data; parentExists = true; });
let parentSetData: any;
let messagesSnapshotCb: ((snap: any) => void) | undefined;
let messagesErrorCb: ((err: any) => void) | undefined;
let parentSnapshotCb: ((doc: any) => void) | undefined;
let parentErrorCb: ((err: any) => void) | undefined;
// How many times each listener has been attached, so a test can assert a re-subscribe actually happened.
let messagesAttachCount = 0;
let parentAttachCount = 0;
// Records the where() constraints applied to the messages query, so a test can assert the read is
// owner-scoped (unconstrained anonymous list reads are denied by the Firestore rules).
let messagesWhere: Array<[string, string, any]> = [];

jest.mock("../../firebase-db", () => {
  // Chainable query stub: orderBy()/where() return the same builder; onSnapshot captures callbacks.
  const query: any = {
    orderBy: () => query,
    where: (field: string, op: string, value: any) => { messagesWhere.push([field, op, value]); return query; },
    onSnapshot: (cb: (snap: any) => void, err: (e: any) => void) => {
      messagesAttachCount++;
      messagesSnapshotCb = cb; messagesErrorCb = err;
      return () => { messagesSnapshotCb = undefined; messagesErrorCb = undefined; };
    },
  };
  return {
    getChatMessagesRef: () => ({ ...query, add: async (doc: any) => { messageAdds.push(doc); } }),
    getChatParentRef: () => ({
      onSnapshot: (cb: (doc: any) => void, err: (e: any) => void) => {
        parentAttachCount++;
        parentSnapshotCb = cb; parentErrorCb = err;
        return () => { parentSnapshotCb = undefined; parentErrorCb = undefined; };
      },
      get: async () => ({ exists: parentExists }),
      set: parentSet,
    }),
    chatServerTimestamp: () => "SERVER_TS",
  };
});

const makeTransport = () => new FirestoreTransport({
  key: "run-key-123456",
  activityId: 9,
  pageId: 2000,
  ownerFields: { run_key: "run-key-123456" },
  activityUrl: "https://authoring.concord.org/activities/9.json",
  hints: { sequenceTitle: "Seq", activityTitle: "Act", activityIndex: 1, activityCount: 3 },
});

const emitMessages = (docs: Array<{ id: string; data: any; pending?: boolean }>) => {
  messagesSnapshotCb?.({
    forEach: (fn: (d: any) => void) =>
      docs.forEach(d => fn({
        id: d.id,
        data: () => d.data,
        metadata: { hasPendingWrites: !!d.pending },
      })),
  });
};

// Firestore TERMINATES an onSnapshot listener after invoking its error callback: it can never fire
// again, and NOTHING arrives on that listener until something re-attaches. Model that contract by
// dropping the captured callbacks as the error is delivered — otherwise a test can "receive" events
// on a listener that is dead in production, which is exactly how the missing re-attach went unnoticed.
const emitParentError = (err: any) => {
  const cb = parentErrorCb;
  parentSnapshotCb = undefined;
  parentErrorCb = undefined;
  cb?.(err);
};

const emitMessagesError = (err: any) => {
  const cb = messagesErrorCb;
  messagesSnapshotCb = undefined;
  messagesErrorCb = undefined;
  cb?.(err);
};

describe("FirestoreTransport", () => {
  beforeEach(() => {
    messageAdds.length = 0;
    parentExists = false;
    parentSetData = undefined;
    parentSet.mockClear();
    messagesWhere = [];
    messagesAttachCount = 0;
    parentAttachCount = 0;
    messagesSnapshotCb = undefined;
    messagesErrorCb = undefined;
    parentSnapshotCb = undefined;
    parentErrorCb = undefined;
  });

  it("constrains the messages read by the owner field (anonymous list reads are otherwise denied)", () => {
    const transport = makeTransport();
    transport.subscribe(() => undefined, () => undefined);
    // run_key owner → query must carry the matching where(), or the rules deny the anonymous list read
    expect(messagesWhere).toContainEqual(["run_key", "==", "run-key-123456"]);
    transport.dispose();
  });

  it("treats a permission-denied PARENT read as idle (conversation not created yet), not error", () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    // A fresh page's parent doc doesn't exist yet; the anonymous read is denied — benign, not a tutor
    // outage.
    emitParentError({ code: "permission-denied", message: "denied" });
    expect(statuses[statuses.length - 1]).toBe("idle");
    // The listener is now dead, so the re-attach must happen before another error can be delivered.
    jest.advanceTimersByTime(kResubscribeBaseMs);
    expect(parentErrorCb).toBeDefined();
    // Any other code is a real read failure worth showing.
    emitParentError({ code: "unavailable", message: "network" });
    expect(statuses[statuses.length - 1]).toBe("error");
    transport.dispose();
    jest.useRealTimers();
  });

  // The parent listener carries the ONLY authoritative tutor-error signal. Attached once in
  // subscribe(), it dies on the fresh-page denial and, without a re-attach, status:"error" is
  // unreachable for the life of the mount — the student watches a typing indicator forever.
  it("re-attaches the parent listener after it is terminated, and then sees status:error", () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    expect(parentAttachCount).toBe(1);

    emitParentError({ code: "permission-denied", message: "denied" });
    expect(parentSnapshotCb).toBeUndefined(); // terminated

    jest.advanceTimersByTime(kResubscribeBaseMs);
    expect(parentAttachCount).toBe(2);
    expect(parentSnapshotCb).toBeDefined();

    // the authoritative error now reaches the UI, which it never did before the re-attach
    parentSnapshotCb?.({ exists: true, data: () => ({ status: "error" }) });
    expect(statuses[statuses.length - 1]).toBe("error");
    transport.dispose();
    jest.useRealTimers();
  });

  // A `list` read has no "doc doesn't exist yet" case, so permission-denied always means the rules
  // rejected the query. Swallowing it as idle showed a healthy-looking chat that would never render.
  it("surfaces a permission-denied MESSAGES read as an error rather than idle", () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    emitMessagesError({ code: "permission-denied", message: "denied" });
    expect(statuses[statuses.length - 1]).toBe("error");
    // and it re-subscribes rather than leaving the conversation dead
    jest.advanceTimersByTime(kResubscribeBaseMs);
    expect(messagesAttachCount).toBe(2);
    transport.dispose();
    jest.useRealTimers();
  });

  it("recovers to idle once a re-subscribed messages listener delivers a snapshot", () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    emitMessagesError({ code: "unavailable", message: "network" });
    expect(statuses[statuses.length - 1]).toBe("error");
    jest.advanceTimersByTime(kResubscribeBaseMs);
    emitMessages([]);
    expect(statuses[statuses.length - 1]).toBe("idle");
    transport.dispose();
    jest.useRealTimers();
  });

  it("gives up re-subscribing after the bounded number of consecutive failures", () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    transport.subscribe(() => undefined, () => undefined);
    for (let i = 0; i < kMaxResubscribeAttempts; i++) {
      emitParentError({ code: "unavailable", message: "network" });
      jest.advanceTimersByTime(kResubscribeBaseMs * Math.pow(2, i));
    }
    expect(parentAttachCount).toBe(1 + kMaxResubscribeAttempts);
    // one more failure exhausts the budget — nothing re-attaches
    emitParentError({ code: "unavailable", message: "network" });
    jest.advanceTimersByTime(60000);
    expect(parentAttachCount).toBe(1 + kMaxResubscribeAttempts);
    transport.dispose();
    jest.useRealTimers();
  });

  it("maps user and non-null assistant docs to turns; ignores logs and null assistant docs", () => {
    const transport = makeTransport();
    const turns: ChatTurn[][] = [];
    transport.subscribe(t => turns.push(t), () => undefined);
    emitMessages([
      { id: "u1", data: { kind: "user", text: "hi" } },
      { id: "a1", data: { kind: "assistant", userText: "hello there" } },
      { id: "a2", data: { kind: "assistant", userText: null } },
      { id: "l1", data: { kind: "log", action: "did thing" } },
    ]);
    const last = turns[turns.length - 1];
    expect(last).toEqual([
      { id: "u1", sender: "user", text: "hi", pending: false },
      { id: "a1", sender: "assistant", text: "hello there" },
    ]);
    transport.dispose();
  });

  it("folds an unanswered user message into generating, and a silent reply clears it", () => {
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    parentSnapshotCb?.({ exists: false, data: () => undefined }); // parent idle
    emitMessages([{ id: "u1", data: { kind: "user", text: "hi" } }]);
    // newest raw doc is an unanswered user message → effective generating
    expect(statuses[statuses.length - 1]).toBe("generating");
    // a silent userText:null assistant doc follows (renders nothing) → effective idle
    emitMessages([
      { id: "u1", data: { kind: "user", text: "hi" } },
      { id: "a1", data: { kind: "assistant", userText: null } },
    ]);
    expect(statuses[statuses.length - 1]).toBe("idle");
    transport.dispose();
  });

  // A turn lost server-side with no status:"error" written (function never fired, cold-start timeout,
  // crash before the status commit) leaves an unanswered user doc and nothing to re-trigger the
  // function, so the indicator spun forever with no error and no way to retry.
  it("times out an unanswered user message and surfaces an error", () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    emitMessages([{ id: "u1", data: { kind: "user", text: "hi" } }]);
    expect(statuses[statuses.length - 1]).toBe("generating");

    jest.advanceTimersByTime(kReplyTimeoutMs - 1);
    expect(statuses[statuses.length - 1]).toBe("generating");

    jest.advanceTimersByTime(1);
    expect(statuses[statuses.length - 1]).toBe("error");
    transport.dispose();
    jest.useRealTimers();
  });

  it("restarts the reply timeout for a new message and clears it on a reply", () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));

    emitMessages([{ id: "u1", data: { kind: "user", text: "hi" } }]);
    jest.advanceTimersByTime(kReplyTimeoutMs);
    expect(statuses[statuses.length - 1]).toBe("error");

    // retrying writes a NEW user doc → fresh clock, error retracted
    emitMessages([
      { id: "u1", data: { kind: "user", text: "hi" } },
      { id: "u2", data: { kind: "user", text: "hi again" } },
    ]);
    expect(statuses[statuses.length - 1]).toBe("generating");

    // the reply lands well inside the new window → idle, and no late timeout fires afterwards
    jest.advanceTimersByTime(kReplyTimeoutMs / 2);
    emitMessages([
      { id: "u1", data: { kind: "user", text: "hi" } },
      { id: "u2", data: { kind: "user", text: "hi again" } },
      { id: "a1", data: { kind: "assistant", userText: "here you go" } },
    ]);
    expect(statuses[statuses.length - 1]).toBe("idle");
    jest.advanceTimersByTime(kReplyTimeoutMs * 2);
    expect(statuses[statuses.length - 1]).toBe("idle");
    transport.dispose();
    jest.useRealTimers();
  });

  it("surfaces parent status:error, but does NOT show typing for a bare status:generating", () => {
    // The function flips status→generating while silently processing forwarded logs (no user question
    // outstanding). That must NOT show the typing indicator — only an outstanding user turn does.
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    parentSnapshotCb?.({ exists: true, data: () => ({ status: "generating" }) });
    parentSnapshotCb?.({ exists: true, data: () => ({ status: "error" }) });
    parentSnapshotCb?.({ exists: false, data: () => undefined });
    // subscribe() emits initial "idle"; generating-with-no-user-msg stays idle; error surfaces; then idle
    expect(statuses).toEqual(["idle", "idle", "error", "idle"]);
    transport.dispose();
  });

  it("keeps typing on when a log doc lands mid-wait, and clears it on the reply", () => {
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    emitMessages([{ id: "u1", data: { kind: "user", text: "hi" } }]);
    expect(statuses[statuses.length - 1]).toBe("generating");
    // a forwarded telemetry log lands AFTER the user message but before the reply → still awaiting
    emitMessages([
      { id: "u1", data: { kind: "user", text: "hi" } },
      { id: "l1", data: { kind: "log", action: "scrolled out of view" } },
    ]);
    expect(statuses[statuses.length - 1]).toBe("generating");
    // the assistant reply arrives (even after the log) → wait clears
    emitMessages([
      { id: "u1", data: { kind: "user", text: "hi" } },
      { id: "l1", data: { kind: "log", action: "scrolled out of view" } },
      { id: "a1", data: { kind: "assistant", userText: "here you go" } },
    ]);
    expect(statuses[statuses.length - 1]).toBe("idle");
    transport.dispose();
  });

  it("creates the parent with owner fields ONLY (never status) then writes a user doc", async () => {
    const transport = makeTransport();
    await transport.sendUserMessage("what is this?");
    // parent created with owner fields, no status/lock fields
    expect(parentSetData).toEqual({ run_key: "run-key-123456" });
    // user message carries refs + display-only hints + owner fields, and no status
    expect(messageAdds).toHaveLength(1);
    expect(messageAdds[0]).toMatchObject({
      kind: "user",
      text: "what is this?",
      createdAt: "SERVER_TS",
      activityUrl: "https://authoring.concord.org/activities/9.json",
      activityId: 9,
      pageId: 2000,
      sequenceTitle: "Seq",
      activityTitle: "Act",
      activityIndex: 1,
      activityCount: 3,
      run_key: "run-key-123456",
    });
    expect(messageAdds[0].status).toBeUndefined();
  });

  // The common real-world sequence: subscribe on a fresh page (parent absent → denied → listener
  // dead), then the student sends. Creating the parent makes it readable again, so revive the
  // listener immediately rather than waiting out the backoff.
  it("revives the dead parent listener as soon as ensureParent creates the doc", async () => {
    const transport = makeTransport();
    transport.subscribe(() => undefined, () => undefined);
    emitParentError({ code: "permission-denied", message: "denied" });
    expect(parentSnapshotCb).toBeUndefined();

    await transport.sendUserMessage("what is this?");
    expect(parentAttachCount).toBe(2);
    expect(parentSnapshotCb).toBeDefined();
    transport.dispose();
  });

  // The denial schedules a retry AND ensureParent() revives the listener on the first send, so on a
  // fresh page both race to re-attach. Whichever loses must not tear down the live listener: that is an
  // unsubscribe plus a fresh Firestore listen, and a re-delivered snapshot that can bounce the status.
  it("does not re-attach the parent listener when ensureParent already revived it", async () => {
    jest.useFakeTimers();
    const transport = makeTransport();
    transport.subscribe(() => undefined, () => undefined);
    expect(parentAttachCount).toBe(1);

    emitParentError({ code: "permission-denied", message: "denied" }); // schedules a retry
    await transport.sendUserMessage("what is this?");                  // revives it first
    expect(parentAttachCount).toBe(2);

    jest.advanceTimersByTime(kResubscribeBaseMs * 4); // the pending retry fires...
    expect(parentAttachCount).toBe(2);                // ...and finds the listener already live
    expect(parentSnapshotCb).toBeDefined();           // the live listener was left intact
    transport.dispose();
    jest.useRealTimers();
  });

  it("does not re-create the parent when it already exists", async () => {
    parentExists = true;
    const transport = makeTransport();
    await transport.sendUserMessage("hello");
    expect(parentSet).not.toHaveBeenCalled();
    expect(messageAdds).toHaveLength(1);
  });

  it("forwards a log as a kind:log doc with owner fields", async () => {
    parentExists = true;
    const transport = makeTransport();
    transport.forwardLog({ interactive_id: "int-1", interactive_url: "https://wildfire.concord.org/", action: "changed", value: 2, data: { a: 1 } });
    // forwardLog is fire-and-forget; flush the async chain (ensureParent + add).
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(messageAdds.some(d => d.kind === "log" && d.interactive_id === "int-1" && d.run_key === "run-key-123456")).toBe(true);
  });

  // The subscription stays alive while the panel is closed (the launcher's pending dot needs it), so
  // the log sink must be driven separately — a closed panel that forwarded logs billed a tutor turn
  // per interactive log for a conversation nobody was reading.
  it("registers as the log sink only when forwarding is explicitly enabled", async () => {
    const { getChatLogSink } = jest.requireActual("./chat-log-forwarder");
    const transport = makeTransport();
    transport.subscribe(() => undefined, () => undefined);
    expect(getChatLogSink()).toBeNull();

    transport.setLogForwarding(true);
    expect(getChatLogSink()).toBe(transport);

    transport.setLogForwarding(false);
    expect(getChatLogSink()).toBeNull();
    transport.dispose();
  });
});
