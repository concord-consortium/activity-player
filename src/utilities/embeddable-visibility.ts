// Pure visibility math and log params, free of React and the DOM; modeled on CLUE's tile-visibility.ts.

export type VisibilityCause =
  "scroll" | "windowResize" | "pageChange" | "tabChange" | "columnToggle" | "embeddableResize"
  | "pageHidden" | "pageVisible";

export interface IEmbeddableInfo {
  embeddableId: string;
  embeddableTitle: string;
  questionNumber?: number; // only when the item's header shows "Question #N"
}

export interface IVisibleEmbeddable extends IEmbeddableInfo {
  percentVisible: number; // whole percent, 1..100 (embeddables at 0 are dropped)
}

/** An embeddable's vertical extent, in the same coordinate space as the viewport bounds. */
export interface IEmbeddableExtent extends IEmbeddableInfo {
  top: number;
  bottom: number;
  height: number;
}

export interface IViewportBounds {
  top: number;
  bottom: number;
}

/** The scroll container's vertical bounds clipped to the window, since the container can extend below it. */
export function getViewportBounds(container: IViewportBounds, windowHeight: number): IViewportBounds {
  return { top: Math.max(container.top, 0), bottom: Math.min(container.bottom, windowHeight) };
}

/**
 * For each embeddable, the fraction of its height inside the viewport, rounded to a whole percent.
 * Embeddables with no overlap or no height are omitted. Input order is preserved.
 */
export function computeVisibleEmbeddables(viewport: IViewportBounds, extents: IEmbeddableExtent[]): IVisibleEmbeddable[] {
  const visible: IVisibleEmbeddable[] = [];
  for (const { top, bottom, height, ...info } of extents) {
    if (height <= 0) continue;
    const overlap = Math.min(bottom, viewport.bottom) - Math.max(top, viewport.top);
    if (overlap <= 0) continue;
    // Any positive overlap counts as visible, so clamp to 1 rather than letting a sliver round to 0.
    visible.push({ ...info, percentVisible: Math.max(1, Math.min(100, Math.round((overlap / height) * 100))) });
  }
  return visible;
}

// A resize follows scrolls and layout changes, and a scroll follows layout changes, so a
// lower-ranked cause is a side effect of a higher-ranked one and never replaces it.
const causeRank = (cause: VisibilityCause) =>
  cause === "embeddableResize" ? 0 : cause === "scroll" ? 1 : 2;

/** The cause to report when another trigger arrives before the pending snapshot settles. */
export function nextVisibilityCause(pending: VisibilityCause | undefined, incoming: VisibilityCause) {
  return pending && causeRank(incoming) < causeRank(pending) ? pending : incoming;
}

export function sameVisibleEmbeddables(a: IVisibleEmbeddable[], b: IVisibleEmbeddable[]) {
  return a.length === b.length && a.every((entry, i) =>
    entry.embeddableId === b[i].embeddableId && entry.percentVisible === b[i].percentVisible);
}

export function buildVisibilityLogParams(
  cause: VisibilityCause, viewportHeight: number, embeddableCount: number, visibleEmbeddables: IVisibleEmbeddable[]
) {
  return { cause, viewportHeight, embeddableCount, visibleEmbeddables };
}
