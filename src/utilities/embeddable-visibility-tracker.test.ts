import { EmbeddableVisibilityTracker } from "./embeddable-visibility-tracker";

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed = new Set<Element>();
  constructor(private callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }
  observe(element: Element) { this.observed.add(element); }
  unobserve(element: Element) { this.observed.delete(element); }
  disconnect() { this.observed.clear(); }
  trigger() { this.callback(); }
}

const rects = new Map<Element, { top: number, height: number }>();
const setRect = (element: Element, top: number, height: number) => {
  rects.set(element, { top, height });
  jest.spyOn(element, "getBoundingClientRect").mockImplementation(() => {
    const rect = rects.get(element) ?? { top: 0, height: 0 };
    return { top: rect.top, bottom: rect.top + rect.height, height: rect.height } as DOMRect;
  });
};

const info = (id: string) => ({ embeddableId: id, embeddableTitle: `title ${id}` });

let container: HTMLDivElement;
let log: jest.Mock;
let tracker: EmbeddableVisibilityTracker;

const addElement = (top: number, height: number, parent: HTMLElement = container) => {
  const element = document.createElement("div");
  parent.appendChild(element);
  setRect(element, top, height);
  return element;
};

const scrollContainer = () => container.dispatchEvent(new Event("scroll"));
const resizeObserver = () => FakeResizeObserver.instances[FakeResizeObserver.instances.length - 1];
const setVisibility = (state: "hidden" | "visible") => {
  jest.spyOn(document, "visibilityState", "get").mockReturnValue(state);
  document.dispatchEvent(new Event("visibilitychange"));
};
const loggedCauses = () => log.mock.calls.map(([params]) => params.cause);
const loggedIds = (call = 0) => log.mock.calls[call][0].visibleEmbeddables.map((e: any) => e.embeddableId);

beforeEach(() => {
  jest.useFakeTimers();
  (window as any).ResizeObserver = FakeResizeObserver;
  FakeResizeObserver.instances = [];
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true, writable: true });
  container = document.createElement("div");
  container.style.overflowY = "auto";
  document.body.appendChild(container);
  setRect(container, 0, 800);
  log = jest.fn();
  tracker = new EmbeddableVisibilityTracker(log);
});

afterEach(() => {
  tracker.dispose();
  document.body.innerHTML = "";
  rects.clear();
  delete (window as any).ResizeObserver;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const startAndSettle = () => {
  tracker.start();
  jest.advanceTimersByTime(500);
  log.mockClear();
};

describe("EmbeddableVisibilityTracker", () => {
  it("logs the pageChange snapshot 500ms after start", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    tracker.register(addElement(700, 200), { ...info("2-ManagedInteractive"), questionNumber: 1 });
    tracker.start();
    jest.advanceTimersByTime(499);
    expect(log).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith({
      cause: "pageChange",
      viewportHeight: 800,
      embeddableCount: 2,
      visibleEmbeddables: [
        { ...info("1-Embeddable::Xhtml"), percentVisible: 100 },
        { ...info("2-ManagedInteractive"), questionNumber: 1, percentVisible: 50 }
      ]
    });
  });

  it("debounces triggers so one event logs 500ms after the last", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    startAndSettle();
    scrollContainer();
    jest.advanceTimersByTime(300);
    scrollContainer();
    jest.advanceTimersByTime(499);
    expect(log).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(loggedCauses()).toEqual(["scroll"]);
  });

  it("keeps a higher-ranked pending cause and lets a scroll replace a pending resize", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    tracker.start();
    resizeObserver().trigger();
    scrollContainer();
    jest.advanceTimersByTime(500);
    expect(loggedCauses()).toEqual(["pageChange"]);

    resizeObserver().trigger();
    scrollContainer();
    jest.advanceTimersByTime(500);
    expect(loggedCauses()).toEqual(["pageChange", "scroll"]);
  });

  it("queues only scrolls of the document or an element that contains the page", () => {
    const other = document.createElement("div");
    document.body.appendChild(other);
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    startAndSettle();
    other.dispatchEvent(new Event("scroll"));
    jest.advanceTimersByTime(500);
    expect(log).not.toHaveBeenCalled();
    scrollContainer();
    jest.advanceTimersByTime(500);
    expect(loggedCauses()).toEqual(["scroll"]);
    document.dispatchEvent(new Event("scroll"));
    jest.advanceTimersByTime(500);
    expect(loggedCauses()).toEqual(["scroll", "scroll"]);
  });

  it("queues windowResize when the window resizes", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    startAndSettle();
    window.dispatchEvent(new Event("resize"));
    jest.advanceTimersByTime(500);
    expect(loggedCauses()).toEqual(["windowResize"]);
  });

  it("excludes embeddables in a hidden notebook tab from the entries and the count", () => {
    const hiddenTab = document.createElement("div");
    hiddenTab.className = "section hidden-tab";
    container.appendChild(hiddenTab);
    tracker.register(addElement(0, 100), info("1-Embeddable::Xhtml"));
    tracker.register(addElement(100, 100, hiddenTab), info("2-ManagedInteractive"));
    tracker.register(addElement(200, 100), info("3-MwInteractive"));
    tracker.start();
    jest.advanceTimersByTime(500);
    expect(log.mock.calls[0][0].embeddableCount).toBe(2);
    expect(loggedIds()).toEqual(["1-Embeddable::Xhtml", "3-MwInteractive"]);
  });

  it("reports entries in document order regardless of registration order", () => {
    const first = addElement(300, 100);
    const second = addElement(0, 100);
    const third = addElement(600, 100);
    tracker.register(third, info("3-MwInteractive"));
    tracker.register(second, info("2-ManagedInteractive"));
    tracker.register(first, info("1-Embeddable::Xhtml"));
    tracker.start();
    jest.advanceTimersByTime(500);
    expect(loggedIds()).toEqual(["1-Embeddable::Xhtml", "2-ManagedInteractive", "3-MwInteractive"]);
  });

  it("clips the viewport to the window when the container extends below it", () => {
    setRect(container, 0, 969);
    tracker.register(addElement(0, 100), info("1-Embeddable::Xhtml"));
    tracker.register(addElement(850, 50), info("2-ManagedInteractive"));
    tracker.start();
    jest.advanceTimersByTime(500);
    const [params] = log.mock.calls[0];
    expect(params.viewportHeight).toBe(800);
    expect(params.embeddableCount).toBe(2);
    expect(loggedIds()).toEqual(["1-Embeddable::Xhtml"]);
  });

  it("skips an embeddableResize snapshot that matches the last one logged", () => {
    const element = addElement(700, 200);
    tracker.register(element, info("1-ManagedInteractive"));
    tracker.start();
    jest.advanceTimersByTime(500);
    expect(log).toHaveBeenCalledTimes(1);

    resizeObserver().trigger();
    jest.advanceTimersByTime(500);
    expect(log).toHaveBeenCalledTimes(1);

    setRect(element, 700, 400);
    resizeObserver().trigger();
    jest.advanceTimersByTime(500);
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[1][0]).toMatchObject({
      cause: "embeddableResize",
      visibleEmbeddables: [{ ...info("1-ManagedInteractive"), percentVisible: 25 }]
    });
  });

  it("logs nothing when no embeddable is visible", () => {
    tracker.register(addElement(900, 100), info("1-Embeddable::Xhtml"));
    tracker.start();
    jest.advanceTimersByTime(500);
    expect(log).not.toHaveBeenCalled();
  });

  it("observes registered elements and stops measuring them once unregistered", () => {
    const element = addElement(0, 100);
    tracker.register(addElement(200, 100), info("1-Embeddable::Xhtml"));
    const unregister = tracker.register(element, info("2-ManagedInteractive"));
    expect(resizeObserver().observed.has(element)).toBe(true);
    unregister();
    expect(resizeObserver().observed.has(element)).toBe(false);
    tracker.start();
    jest.advanceTimersByTime(500);
    expect(log.mock.calls[0][0].embeddableCount).toBe(1);
  });

  it("logs a pending snapshot and then pageHidden immediately when the tab is hidden", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    startAndSettle();
    scrollContainer();
    setVisibility("hidden");
    expect(log).toHaveBeenCalledTimes(2);
    expect(log.mock.calls[0][0].cause).toBe("scroll");
    expect(log.mock.calls[1][0]).toEqual({
      cause: "pageHidden", viewportHeight: 800, embeddableCount: 1, visibleEmbeddables: []
    });

    setVisibility("hidden");
    expect(log).toHaveBeenCalledTimes(2);

    scrollContainer();
    jest.advanceTimersByTime(1000);
    expect(log).toHaveBeenCalledTimes(2);

    setVisibility("visible");
    jest.advanceTimersByTime(499);
    expect(log).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1);
    expect(loggedCauses()).toEqual(["scroll", "pageHidden", "pageVisible"]);
  });

  it("logs no pageHidden when nothing has been logged", () => {
    tracker.register(addElement(900, 100), info("1-Embeddable::Xhtml"));
    startAndSettle();
    setVisibility("hidden");
    expect(log).not.toHaveBeenCalled();
  });

  it("logs a pending scroll on dispose", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    startAndSettle();
    scrollContainer();
    tracker.dispose();
    expect(loggedCauses()).toEqual(["scroll"]);
  });

  it("drops any other pending cause on dispose", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    startAndSettle();
    tracker.queue("columnToggle");
    tracker.dispose();
    jest.advanceTimersByTime(1000);
    expect(log).not.toHaveBeenCalled();
  });

  it("stops listening and registering after dispose", () => {
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    startAndSettle();
    tracker.dispose();
    const queue = jest.fn();
    tracker.queue = queue;
    document.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    setVisibility("visible");
    expect(queue).not.toHaveBeenCalled();

    const element = addElement(0, 100);
    tracker.register(element, info("2-ManagedInteractive"))();
    expect(resizeObserver().observed.has(element)).toBe(false);
  });

  it("works without ResizeObserver", () => {
    tracker.dispose();
    delete (window as any).ResizeObserver;
    tracker = new EmbeddableVisibilityTracker(log);
    tracker.register(addElement(0, 200), info("1-Embeddable::Xhtml"));
    tracker.start();
    jest.advanceTimersByTime(500);
    expect(loggedCauses()).toEqual(["pageChange"]);
  });
});
