import React, { useContext, useEffect, useRef } from "react";
import { render } from "@testing-library/react";
import { EmbeddableVisibilityProvider } from "./embeddable-visibility-provider";
import { EmbeddableVisibilityContext } from "../embeddable-visibility-context";
import { Logger, LogEventName } from "../../lib/logger";

const Registrant: React.FC = () => {
  const visibility = useContext(EmbeddableVisibilityContext);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current!;
    jest.spyOn(element, "getBoundingClientRect").mockReturnValue({ top: 0, bottom: 100, height: 100 } as DOMRect);
    return visibility?.register(element, { embeddableId: "1-Embeddable::Xhtml", embeddableTitle: "" });
  }, [visibility]);
  return <div ref={ref} />;
};

describe("EmbeddableVisibilityProvider", () => {
  let log: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    log = jest.spyOn(Logger, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it("logs a pageChange snapshot through Logger.log after mounting", () => {
    render(<EmbeddableVisibilityProvider><Registrant /></EmbeddableVisibilityProvider>);
    expect(log).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      event: LogEventName.EMBEDDABLE_VISIBILITY_CHANGE,
      parameters: expect.objectContaining({
        cause: "pageChange",
        embeddableCount: 1,
        visibleEmbeddables: [{ embeddableId: "1-Embeddable::Xhtml", embeddableTitle: "", percentVisible: 100 }]
      })
    });
  });

  it("logs a pending scroll synchronously on unmount", () => {
    const { unmount } = render(<EmbeddableVisibilityProvider><Registrant /></EmbeddableVisibilityProvider>);
    jest.advanceTimersByTime(500);
    log.mockClear();
    document.dispatchEvent(new Event("scroll"));
    unmount();
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0].parameters.cause).toBe("scroll");
  });
});
