import {
  buildVisibilityLogParams, computeVisibleEmbeddables, getViewportBounds, IEmbeddableExtent, IVisibleEmbeddable,
  nextVisibilityCause, sameVisibleEmbeddables, VisibilityCause
} from "./embeddable-visibility";

const viewport = { top: 0, bottom: 889 };

const extent = (embeddableId: string, top: number, height: number): IEmbeddableExtent =>
  ({ embeddableId, embeddableTitle: `title ${embeddableId}`, top, bottom: top + height, height });

const percentOf = (e: IEmbeddableExtent) => computeVisibleEmbeddables(viewport, [e])[0]?.percentVisible;

describe("computeVisibleEmbeddables", () => {
  it("reports an embeddable fully inside the viewport as 100", () => {
    expect(percentOf(extent("1-Embeddable::Xhtml", 100, 200))).toBe(100);
  });

  it("reports an embeddable half off the top as 50", () => {
    expect(percentOf(extent("1-Embeddable::Xhtml", -100, 200))).toBe(50);
  });

  it("reports an embeddable half off the bottom as 50", () => {
    expect(percentOf(extent("1-Embeddable::Xhtml", 789, 200))).toBe(50);
  });

  it("clamps a 1px sliver of a 1000px embeddable to 1 rather than dropping it", () => {
    expect(percentOf(extent("1-Embeddable::Xhtml", 888, 1000))).toBe(1);
  });

  it("drops an embeddable that touches the viewport edge with zero overlap", () => {
    expect(computeVisibleEmbeddables(viewport, [extent("1-Embeddable::Xhtml", 889, 100)])).toEqual([]);
  });

  it("drops an embeddable with zero height", () => {
    expect(computeVisibleEmbeddables(viewport, [extent("1-Embeddable::Xhtml", 100, 0)])).toEqual([]);
  });

  it("divides by the embeddable's height, so one taller than the viewport cannot reach 100", () => {
    expect(percentOf(extent("1-Embeddable::Xhtml", -500, 2000))).toBe(44);
  });

  it("preserves input order and carries the embeddable info through", () => {
    const visible = computeVisibleEmbeddables(viewport, [
      extent("3-ManagedInteractive", 600, 100),
      { ...extent("1-ManagedInteractive", 0, 100), questionNumber: 2 },
      extent("2-MwInteractive", 300, 100)
    ]);
    expect(visible).toEqual([
      { embeddableId: "3-ManagedInteractive", embeddableTitle: "title 3-ManagedInteractive", percentVisible: 100 },
      { embeddableId: "1-ManagedInteractive", embeddableTitle: "title 1-ManagedInteractive", questionNumber: 2,
        percentVisible: 100 },
      { embeddableId: "2-MwInteractive", embeddableTitle: "title 2-MwInteractive", percentVisible: 100 }
    ]);
  });
});

describe("getViewportBounds", () => {
  it("clips a container that extends below the window", () => {
    expect(getViewportBounds({ top: 0, bottom: 969 }, 888)).toEqual({ top: 0, bottom: 888 });
  });

  it("clips a container that extends above the window", () => {
    expect(getViewportBounds({ top: -80, bottom: 500 }, 888)).toEqual({ top: 0, bottom: 500 });
  });

  it("leaves a container inside the window unchanged", () => {
    expect(getViewportBounds({ top: 40, bottom: 800 }, 888)).toEqual({ top: 40, bottom: 800 });
  });
});

describe("nextVisibilityCause", () => {
  const table: [VisibilityCause, VisibilityCause, VisibilityCause][] = [
    ["embeddableResize", "embeddableResize", "embeddableResize"],
    ["embeddableResize", "scroll", "scroll"],
    ["embeddableResize", "columnToggle", "columnToggle"],
    ["scroll", "embeddableResize", "scroll"],
    ["scroll", "scroll", "scroll"],
    ["scroll", "columnToggle", "columnToggle"],
    ["columnToggle", "embeddableResize", "columnToggle"],
    ["columnToggle", "scroll", "columnToggle"],
    ["columnToggle", "columnToggle", "columnToggle"]
  ];
  it.each(table)("pending %s, incoming %s reports %s", (pending, incoming, expected) => {
    expect(nextVisibilityCause(pending, incoming)).toBe(expected);
  });

  it("takes the incoming cause when nothing is pending", () => {
    expect(nextVisibilityCause(undefined, "embeddableResize")).toBe("embeddableResize");
  });

  it("lets the newest cause win within the top rank", () => {
    expect(nextVisibilityCause("pageChange", "tabChange")).toBe("tabChange");
  });
});

describe("sameVisibleEmbeddables", () => {
  const a: IVisibleEmbeddable = { embeddableId: "1-ManagedInteractive", embeddableTitle: "A", percentVisible: 50 };
  const b: IVisibleEmbeddable = { embeddableId: "2-Embeddable::Xhtml", embeddableTitle: "B", percentVisible: 100 };

  it("is true for equal snapshots", () => {
    expect(sameVisibleEmbeddables([a, b], [{ ...a }, { ...b }])).toBe(true);
  });

  it("is false when one percentage differs", () => {
    expect(sameVisibleEmbeddables([a, b], [a, { ...b, percentVisible: 99 }])).toBe(false);
  });

  it("is false for different lengths", () => {
    expect(sameVisibleEmbeddables([a, b], [a])).toBe(false);
    expect(sameVisibleEmbeddables([a], [a, b])).toBe(false);
  });

  it("is false for the same entries in a different order", () => {
    expect(sameVisibleEmbeddables([a, b], [b, a])).toBe(false);
  });
});

describe("buildVisibilityLogParams", () => {
  it("assembles the logged parameters", () => {
    const visible: IVisibleEmbeddable[] = [{ embeddableId: "1-MwInteractive", embeddableTitle: "", percentVisible: 7 }];
    expect(buildVisibilityLogParams("scroll", 800, 4, visible)).toEqual({
      cause: "scroll", viewportHeight: 800, embeddableCount: 4, visibleEmbeddables: visible
    });
  });
});
