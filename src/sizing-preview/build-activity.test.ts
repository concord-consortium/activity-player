import { buildActivity, kInteractiveName, kInteractiveRefId } from "./build-activity";
import { kDefaultSettings, ISizingSettings } from "./settings";
import { IEmbeddableXhtml, IManagedInteractive, IMwInteractive } from "../types";

const settingsWith = (overrides: Partial<ISizingSettings>): ISizingSettings =>
  ({ ...kDefaultSettings, ...overrides });

const sectionOf = (settings: ISizingSettings) => buildActivity(settings).pages[0].sections[0];
const interactiveOf = (settings: ISizingSettings) =>
  sectionOf(settings).embeddables.find(e => e.ref_id === kInteractiveRefId)!;
const xhtmlOf = (settings: ISizingSettings) =>
  sectionOf(settings).embeddables.find(e => e.type === "Embeddable::Xhtml") as IEmbeddableXhtml | undefined;

describe("buildActivity", () => {
  it("builds a single-page version 2 activity without an id", () => {
    const activity = buildActivity(settingsWith({ fixedWidthLayout: "ipad_friendly" }));
    expect(activity.version).toBe(2);
    expect(activity.id).toBeUndefined();
    expect(activity.fixed_width_layout).toBe("ipad_friendly");
    expect(activity.pages).toHaveLength(1);
    expect(activity.pages[0].sections).toHaveLength(1);
  });

  it("makes the section stacked and not collapsible", () => {
    const section = sectionOf(settingsWith({ layout: "60-40" }));
    expect(section.layout).toBe("60-40");
    expect(section.secondary_column_display_mode).toBe("stacked");
    expect(section.secondary_column_collapsible).toBe(false);
  });

  describe("mw kind", () => {
    const mw = (overrides: Partial<ISizingSettings> = {}) =>
      interactiveOf(settingsWith({ kind: "mw", ...overrides })) as IMwInteractive;

    it("puts the settings on the MwInteractive", () => {
      const embeddable = mw({
        interactive: "https://example.com/i.html", aspectRatioMethod: "MANUAL", nativeWidth: 300, nativeHeight: 200
      });
      expect(embeddable.type).toBe("MwInteractive");
      expect(embeddable.url).toBe("https://example.com/i.html");
      expect(embeddable.aspect_ratio_method).toBe("MANUAL");
      expect(embeddable.native_width).toBe(300);
      expect(embeddable.native_height).toBe(200);
      expect(embeddable.click_to_play).toBe(false);
      expect(embeddable.name).toBe(kInteractiveName);
    });

    it("sets both learner-state flags from clearButton", () => {
      expect(mw({ clearButton: true }).enable_learner_state).toBe(true);
      expect(mw({ clearButton: true }).show_delete_data_button).toBe(true);
      expect(mw({ clearButton: false }).enable_learner_state).toBe(false);
      expect(mw({ clearButton: false }).show_delete_data_button).toBe(false);
    });
  });

  describe("library kind", () => {
    const library = (overrides: Partial<ISizingSettings> = {}) =>
      interactiveOf(settingsWith({ kind: "library", ...overrides })) as IManagedInteractive;

    it("puts the settings in the library data and inherits them", () => {
      const embeddable = library({
        interactive: "https://example.com/i.html", aspectRatioMethod: "MAX", nativeWidth: 300, nativeHeight: 200
      });
      const data = embeddable.library_interactive!.data;
      expect(embeddable.type).toBe("ManagedInteractive");
      expect(data.base_url).toBe("https://example.com/i.html");
      expect(data.aspect_ratio_method).toBe("MAX");
      expect(data.native_width).toBe(300);
      expect(data.native_height).toBe(200);
      expect(data.click_to_play).toBe(false);
      expect(embeddable.inherit_aspect_ratio_method).toBe(true);
      expect(embeddable.inherit_native_width).toBe(true);
      expect(embeddable.inherit_native_height).toBe(true);
    });

    it("leaves the custom fields null", () => {
      // section.tsx reads custom_aspect_ratio_method without checking the inherit flag, so a
      // non-null value here would make an inheriting interactive stretch like a MAX one.
      const embeddable = library({ aspectRatioMethod: "MAX" });
      expect(embeddable.custom_aspect_ratio_method).toBeNull();
      expect(embeddable.custom_native_width).toBeNull();
      expect(embeddable.custom_native_height).toBeNull();
    });

    it("sets both learner-state flags from clearButton on the library data", () => {
      const on = library({ clearButton: true }).library_interactive!.data;
      expect(on.enable_learner_state).toBe(true);
      expect(on.show_delete_data_button).toBe(true);
      const off = library({ clearButton: false }).library_interactive!.data;
      expect(off.enable_learner_state).toBe(false);
      expect(off.show_delete_data_button).toBe(false);
    });
  });

  describe("library-custom kind", () => {
    const custom = (overrides: Partial<ISizingSettings> = {}) =>
      interactiveOf(settingsWith({ kind: "library-custom", ...overrides })) as IManagedInteractive;

    it("keeps LARA's defaults in the library data and puts the settings in the custom fields", () => {
      const embeddable = custom({ aspectRatioMethod: "MANUAL", nativeWidth: 300, nativeHeight: 200 });
      const data = embeddable.library_interactive!.data;
      expect(data.aspect_ratio_method).toBe("DEFAULT");
      expect(data.native_width).toBe(576);
      expect(data.native_height).toBe(435);
      expect(embeddable.inherit_aspect_ratio_method).toBe(false);
      expect(embeddable.inherit_native_width).toBe(false);
      expect(embeddable.inherit_native_height).toBe(false);
      expect(embeddable.custom_aspect_ratio_method).toBe("MANUAL");
      expect(embeddable.custom_native_width).toBe(300);
      expect(embeddable.custom_native_height).toBe(200);
    });

    it("sets both learner-state flags from clearButton on the library data", () => {
      const on = custom({ clearButton: true }).library_interactive!.data;
      expect(on.enable_learner_state).toBe(true);
      expect(on.show_delete_data_button).toBe(true);
      const off = custom({ clearButton: false }).library_interactive!.data;
      expect(off.enable_learner_state).toBe(false);
      expect(off.show_delete_data_button).toBe(false);
    });
  });

  it("names the interactive only when named", () => {
    expect(interactiveOf(settingsWith({ named: true })).name).toBe(kInteractiveName);
    expect(interactiveOf(settingsWith({ named: false })).name).toBe("");
  });

  describe("columns", () => {
    it("puts the interactive alone in the primary column of a single-column layout, even if secondary was set", () => {
      const section = sectionOf(settingsWith({ layout: "full-width", column: "secondary" }));
      expect(section.embeddables).toHaveLength(1);
      expect(section.embeddables[0].column).toBe("primary");
    });

    it("puts the text in the other column of a two-column layout", () => {
      const section = sectionOf(settingsWith({ layout: "60-40", column: "secondary" }));
      expect(section.embeddables).toHaveLength(2);
      expect(interactiveOf(settingsWith({ layout: "60-40", column: "secondary" })).column).toBe("secondary");
      expect(xhtmlOf(settingsWith({ layout: "60-40", column: "secondary" }))!.column).toBe("primary");
    });

    it("puts the text in the secondary column when the interactive is primary", () => {
      const settings = settingsWith({ layout: "40-60", column: "primary" });
      expect(interactiveOf(settings).column).toBe("primary");
      expect(xhtmlOf(settings)!.column).toBe("secondary");
    });

    it("gives every embeddable a unique ref_id", () => {
      const ids = sectionOf(settingsWith({ layout: "60-40" })).embeddables.map(e => e.ref_id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("other column's text", () => {
    const paragraphs = (otherText: "tall" | "short") =>
      (xhtmlOf(settingsWith({ layout: "60-40", otherText }))!.content!.match(/<p>/g) ?? []).length;

    it("is many paragraphs when tall", () => {
      expect(paragraphs("tall")).toBeGreaterThanOrEqual(20);
    });

    it("is one paragraph when short", () => {
      expect(paragraphs("short")).toBe(1);
    });
  });
});
