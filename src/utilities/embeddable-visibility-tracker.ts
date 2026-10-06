import { Logger, LogEventName } from "../lib/logger";
import {
  buildVisibilityLogParams, computeVisibleEmbeddables, getViewportBounds, IEmbeddableExtent, IEmbeddableInfo,
  IVisibleEmbeddable, nextVisibilityCause, sameVisibleEmbeddables, VisibilityCause
} from "./embeddable-visibility";

export const kVisibilitySettleMs = 500;
// Bounds the debounce, so triggers arriving faster than the settle time (an animating interactive) still log.
export const kVisibilityMaxWaitMs = 2000;

type VisibilityLogger = (parameters: ReturnType<typeof buildVisibilityLogParams>) => void;

const logVisibility: VisibilityLogger = parameters =>
  Logger.log({ event: LogEventName.EMBEDDABLE_VISIBILITY_CHANGE, parameters });

export interface IEmbeddableVisibilityTracker {
  /** Starts measuring an embeddable's outer element; returns the function that stops. */
  register: (element: HTMLElement, info: IEmbeddableInfo) => () => void;
  queue: (cause: VisibilityCause) => void;
}

// The nearest ancestor that scrolls: #app normally, .app with ?logMonitor=true.
const scrollContainerOf = (element: Element) => {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
  }
  return undefined;
};

const byDocumentOrder = (a: { element: Element }, b: { element: Element }) =>
  a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;

export class EmbeddableVisibilityTracker implements IEmbeddableVisibilityTracker {
  private elements = new Map<HTMLElement, IEmbeddableInfo>();
  private resizeObserver?: ResizeObserver;
  private pendingCause?: VisibilityCause;
  private timer?: number;
  private burstStart = 0;
  // Lets an unchanged resize be skipped and pageHidden close only a view that was reported.
  private lastLogged?: IVisibleEmbeddable[];
  private disposed = false;

  constructor(
    private log: VisibilityLogger = logVisibility, private settleMs = kVisibilitySettleMs,
    private maxWaitMs = kVisibilityMaxWaitMs
  ) {
    if (typeof window.ResizeObserver !== "undefined") {
      this.resizeObserver = new window.ResizeObserver(() => this.queue("embeddableResize"));
    }
  }

  start() {
    // Capture phase: the page scrolls inside #app (or .app), and element scroll events don't bubble.
    document.addEventListener("scroll", this.handleScroll, true);
    window.addEventListener("resize", this.handleWindowResize);
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.queue("pageChange");
  }

  register = (element: HTMLElement, info: IEmbeddableInfo) => {
    if (this.disposed) return () => undefined;
    this.elements.set(element, info);
    this.resizeObserver?.observe(element);
    return () => {
      this.elements.delete(element);
      this.resizeObserver?.unobserve(element);
    };
  };

  queue = (cause: VisibilityCause) => {
    if (this.disposed || document.visibilityState === "hidden") return;
    const now = Date.now();
    if (this.timer === undefined) this.burstStart = now;
    this.pendingCause = nextVisibilityCause(this.pendingCause, cause);
    window.clearTimeout(this.timer);
    const delay = Math.min(this.settleMs, this.burstStart + this.maxWaitMs - now);
    this.timer = window.setTimeout(this.settle, Math.max(0, delay));
  };

  /**
   * Stops all triggers. A pending scroll is logged now, while the page is still mounted; any other
   * pending cause is dropped, because the next page reports its own pageChange.
   */
  dispose() {
    document.removeEventListener("scroll", this.handleScroll, true);
    window.removeEventListener("resize", this.handleWindowResize);
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.resizeObserver?.disconnect();
    if (this.pendingCause === "scroll") {
      this.settle();
    } else {
      this.cancel();
    }
    this.disposed = true;
    this.elements.clear();
  }

  private settle = () => {
    const cause = this.pendingCause;
    this.cancel();
    if (cause) this.emit(cause);
  };

  private cancel() {
    window.clearTimeout(this.timer);
    this.timer = undefined;
    this.pendingCause = undefined;
  }

  private handleScroll = (e: Event) => {
    const { target } = e;
    // Only scrolls that move the page: the chat, sidebar and glossary have scrollers of their own.
    const first: HTMLElement | undefined = this.elements.keys().next().value;
    if (target === document || (first && target instanceof Element && target.contains(first))) {
      this.queue("scroll");
    }
  };

  private handleWindowResize = () => this.queue("windowResize");

  private handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      // Logged now rather than debounced, since a hidden tab throttles timers.
      this.settle();
      if (this.lastLogged?.length) {
        const { viewportHeight, embeddableCount } = this.measure();
        this.log(buildVisibilityLogParams("pageHidden", viewportHeight, embeddableCount, []));
        this.lastLogged = [];
      }
    } else {
      this.queue("pageVisible");
    }
  };

  private measure() {
    const extents: (IEmbeddableExtent & { element: HTMLElement })[] = [];
    this.elements.forEach((info, element) => {
      // Non-selected notebook tabs keep their embeddables mounted at full height.
      if (element.closest(".hidden-tab")) return;
      const { top, bottom, height } = element.getBoundingClientRect();
      extents.push({ ...info, top, bottom, height, element });
    });
    extents.sort(byDocumentOrder);
    const container = extents[0] && scrollContainerOf(extents[0].element);
    const viewport = getViewportBounds(
      container?.getBoundingClientRect() ?? { top: 0, bottom: window.innerHeight }, window.innerHeight);
    return {
      viewportHeight: Math.round(Math.max(0, viewport.bottom - viewport.top)),
      embeddableCount: extents.length,
      visibleEmbeddables: computeVisibleEmbeddables(viewport, extents.map(({ element, ...extent }) => extent))
    };
  }

  private emit(cause: VisibilityCause) {
    const { viewportHeight, embeddableCount, visibleEmbeddables } = this.measure();
    if (visibleEmbeddables.length === 0) return;
    if (cause === "embeddableResize" && this.lastLogged && sameVisibleEmbeddables(this.lastLogged, visibleEmbeddables)) {
      return;
    }
    this.log(buildVisibilityLogParams(cause, viewportHeight, embeddableCount, visibleEmbeddables));
    this.lastLogged = visibleEmbeddables;
  }
}
