import { generateEmbeddableRuntimeContext } from "./embeddable-runtime-context";
import { IInteractiveState } from "../plugin-api";
import { emitInteractiveAvailable, emitInteractiveSupportedFeatures } from "../events";
import fetch from "jest-fetch-mock";
import { EmbeddableBase } from "../../types";
import { IEmbeddableContextOptions } from "./plugin-context";

(window as any).fetch = fetch;

describe("Embeddable runtime context helper", () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  const embeddableContext: IEmbeddableContextOptions = {
    container: document.createElement("div"),
    laraJson: {
      name: "Test Interactive",
      type: "MwInteractive",
      ref_id: "86-MwInteractive"
    } as EmbeddableBase,
    interactiveStateUrl: "http://interactive.state.url",
    interactiveAvailable: true
  };

  it("should copy basic properties to runtime context", () => {
    const runtimeContext = generateEmbeddableRuntimeContext(embeddableContext);
    expect(runtimeContext.container).toEqual(embeddableContext.container);
    expect(runtimeContext.laraJson).toEqual(embeddableContext.laraJson);
  });

  describe("#getInteractiveState", () => {
    it("returns null when interactiveStateUrl is not available", () => {
      const runtimeContext = generateEmbeddableRuntimeContext(
        Object.assign({}, embeddableContext, {interactiveStateUrl: null})
      );
      const resp = runtimeContext.getInteractiveState();
      expect(resp).toBeNull();
    });

    it("provides interactive state when interactiveStateUrl is available", done => {
      const runtimeContext = generateEmbeddableRuntimeContext(embeddableContext);
      const interactiveState: IInteractiveState = {id: 123} as IInteractiveState;
      fetch.mockResponse(JSON.stringify(interactiveState));
      const resp = runtimeContext.getInteractiveState();
      expect(fetch.mock.calls[0][0]).toEqual(embeddableContext.interactiveStateUrl);
      expect(resp).toBeInstanceOf(Promise);
      resp!.then(data => {
        expect(data).toEqual(interactiveState);
        done();
      });
    });

    it("returns error when LARA response is malformed", done => {
      const runtimeContext = generateEmbeddableRuntimeContext(embeddableContext);
      fetch.mockResponse("{malformedJSON:");
      const resp = runtimeContext.getInteractiveState();
      expect(fetch.mock.calls[0][0]).toEqual(embeddableContext.interactiveStateUrl);
      expect(resp).toBeInstanceOf(Promise);
      resp!.catch(err => {
        done();
      });
    });
  });

  describe("#getReportingUrl", () => {
    it("returns link to the Portal Report", async () => {
      const runtimeContext = generateEmbeddableRuntimeContext(
        Object.assign({}, embeddableContext)
      );
      const resp = await runtimeContext.getReportingUrl();
      expect(resp).toMatch(/portal-report\.concord\.org/);
      expect(resp).toMatch(/iframeQuestionId=mw_interactive_86/);
    });
  });

  describe("#onInteractiveAvailable", () => {
    it("accepts handler and calls it when this particular interactive is actually started", () => {
      const runtimeContext = generateEmbeddableRuntimeContext(embeddableContext);
      const handler = jest.fn();
      runtimeContext.onInteractiveAvailable(handler);
      // Different container => different interactive. Handler should not be called.
      emitInteractiveAvailable({ container: document.createElement("div"), available: false });
      expect(handler).toHaveBeenCalledTimes(0);
      const event = { container: embeddableContext.container, available: true };
      emitInteractiveAvailable(event);
      expect(handler).toHaveBeenCalledWith(event);
    });
  });

  describe("#onInteractiveSupportedFeatures", () => {
    it("accepts handler and calls it when this particular interactive specifies its supported features", () => {
      const runtimeContext = generateEmbeddableRuntimeContext(embeddableContext);
      const handler = jest.fn();
      runtimeContext.onInteractiveSupportedFeatures(handler);
      // Different container => different interactive. Handler should not be called.
      emitInteractiveSupportedFeatures({ container: document.createElement("div"), supportedFeatures: {} });
      expect(handler).toHaveBeenCalledTimes(0);
      const event = { container: embeddableContext.container, supportedFeatures: {} };
      emitInteractiveSupportedFeatures(event);
      expect(handler).toHaveBeenCalledWith(event);
    });
  });

  describe("#sendCustomMessage", () => {
    it("provides sendCustomMessage function", () => {
      const runtimeContext = generateEmbeddableRuntimeContext(embeddableContext);
      runtimeContext.sendCustomMessage({ type: "foo", content: { bar: true } });
    });
  });
});
