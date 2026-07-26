import { FirestoreTransport } from "./transport-firestore";
import { ChatStatus, ChatTurn } from "./transport";

// Fakes for the firebase-db chat helpers so we can assert reads/writes without a real Firestore.
const messageAdds: any[] = [];
let parentExists = false;
const parentSet = jest.fn(async (data: any) => { parentSetData = data; parentExists = true; });
let parentSetData: any;
let messagesSnapshotCb: ((snap: any) => void) | undefined;
let parentSnapshotCb: ((doc: any) => void) | undefined;
let parentErrorCb: ((err: any) => void) | undefined;
// Records the where() constraints applied to the messages query, so a test can assert the read is
// owner-scoped (unconstrained anonymous list reads are denied by the Firestore rules).
let messagesWhere: Array<[string, string, any]> = [];

jest.mock("../../firebase-db", () => {
  // Chainable query stub: orderBy()/where() return the same builder; onSnapshot captures callbacks.
  const query: any = {
    orderBy: () => query,
    where: (field: string, op: string, value: any) => { messagesWhere.push([field, op, value]); return query; },
    onSnapshot: (cb: (snap: any) => void, _err: (e: any) => void) => {
      messagesSnapshotCb = cb;
      return () => { messagesSnapshotCb = undefined; };
    },
  };
  return {
    getChatMessagesRef: () => ({ ...query, add: async (doc: any) => { messageAdds.push(doc); } }),
    getChatParentRef: () => ({
      onSnapshot: (cb: (doc: any) => void, err: (e: any) => void) => {
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

describe("FirestoreTransport", () => {
  beforeEach(() => {
    messageAdds.length = 0;
    parentExists = false;
    parentSetData = undefined;
    parentSet.mockClear();
    messagesWhere = [];
  });

  it("constrains the messages read by the owner field (anonymous list reads are otherwise denied)", () => {
    const transport = makeTransport();
    transport.subscribe(() => undefined, () => undefined);
    // run_key owner → query must carry the matching where(), or the rules deny the anonymous list read
    expect(messagesWhere).toContainEqual(["run_key", "==", "run-key-123456"]);
    transport.dispose();
  });

  it("treats a permission-denied read as idle (conversation not created yet), not error", () => {
    const transport = makeTransport();
    const statuses: ChatStatus[] = [];
    transport.subscribe(() => undefined, s => statuses.push(s));
    // A fresh page's parent doc doesn't exist yet; the anonymous read is denied — benign, not a tutor
    // outage. Other error codes still surface as error.
    parentErrorCb?.({ code: "permission-denied", message: "denied" });
    expect(statuses[statuses.length - 1]).toBe("idle");
    parentErrorCb?.({ code: "unavailable", message: "network" });
    expect(statuses[statuses.length - 1]).toBe("error");
    transport.dispose();
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
});
