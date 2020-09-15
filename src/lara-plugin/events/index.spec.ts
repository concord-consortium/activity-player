import * as events from "./index";
import { IInteractiveAvailableEvent } from "./index";

describe("Events helper", () => {
  describe("Log event", () => {
    it("provides working API for event handling", () => {
      const handler = jest.fn();
      events.onLog(handler);
      const e = { event: "test" };
      events.emitLog(e);
      expect(handler).toHaveBeenNthCalledWith(1, e);
      events.offLog(handler);
      events.emitLog(e);
      expect(handler).toHaveBeenNthCalledWith(1, e);
    });
  });

  describe("InteractiveAvailable event", () => {
    it("provides working API for event handling", () => {
      const handler = jest.fn();
      events.onInteractiveAvailable(handler);
      const e: IInteractiveAvailableEvent = { container: document.createElement("div"), available: true };
      events.emitInteractiveAvailable(e);
      expect(handler).toHaveBeenNthCalledWith(1, e);
      events.offInteractiveAvailable(handler);
      events.emitInteractiveAvailable(e);
      expect(handler).toHaveBeenNthCalledWith(1, e);
    });
  });
});
