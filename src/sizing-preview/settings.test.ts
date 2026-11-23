import {
  ISizingSettings, kDefaultInteractiveUrl, kDefaultSettings, formatSettings, isResponsiveLayout,
  isTwoColumnLayout, parseSettings, kSectionLayouts
} from "./settings";

describe("parseSettings", () => {
  it("returns the defaults for an empty hash", () => {
    expect(parseSettings("")).toEqual(kDefaultSettings);
    expect(parseSettings("#")).toEqual(kDefaultSettings);
  });

  it("accepts a hash with or without the leading #", () => {
    expect(parseSettings("#kind=mw").kind).toBe("mw");
    expect(parseSettings("kind=mw").kind).toBe("mw");
  });

  it("round-trips a full set of settings", () => {
    const settings: ISizingSettings = {
      interactive: "https://example.com/x?a=1&b=2#frag",
      fixedWidthLayout: "ipad_friendly",
      layout: "60-40",
      column: "secondary",
      kind: "library-custom",
      aspectRatioMethod: "MANUAL",
      nativeWidth: 800,
      nativeHeight: 300,
      named: false,
      clearButton: true,
      otherText: "short"
    };
    expect(parseSettings(formatSettings(settings))).toEqual(settings);
  });

  it("falls back to the default for a bad value without affecting the others", () => {
    const settings = parseSettings("#layout=foo&kind=mw");
    expect(settings.layout).toBe("full-width");
    expect(settings.kind).toBe("mw");
  });

  it.each(["native_width=-3", "native_width=8.5", "native_width=", "native_width=abc", "native_width=0"])(
    "falls back to the default width for %s", (hash) => {
      expect(parseSettings(`#${hash}&native_height=200`)).toEqual(
        { ...kDefaultSettings, nativeWidth: 576, nativeHeight: 200 });
    });

  it("falls back to the default height for a bad height", () => {
    expect(parseSettings("#native_height=1e3").nativeHeight).toBe(435);
  });

  it.each(["javascript:alert(1)", "example.com/x", ""])("rejects the interactive URL %j", (url) => {
    expect(parseSettings(`#interactive=${encodeURIComponent(url)}`).interactive).toBe(kDefaultInteractiveUrl);
  });

  it("accepts only 1 and 0 for name and show_delete_data_button", () => {
    expect(parseSettings("#name=yes").named).toBe(true);
    expect(parseSettings("#name=0").named).toBe(false);
    expect(parseSettings("#show_delete_data_button=true").clearButton).toBe(false);
    expect(parseSettings("#show_delete_data_button=1").clearButton).toBe(true);
  });
});

describe("formatSettings", () => {
  it("writes only the settings that apply to the defaults", () => {
    expect(formatSettings(kDefaultSettings)).toBe(
      "#fixed_width_layout=1100px&layout=full-width&kind=library&aspect_ratio_method=DEFAULT&name=1&show_delete_data_button=0");
  });

  it("includes column and other_text for a two-column layout", () => {
    expect(formatSettings({ ...kDefaultSettings, layout: "60-40" })).toBe(
      "#fixed_width_layout=1100px&layout=60-40&column=primary&kind=library&aspect_ratio_method=DEFAULT" +
      "&name=1&show_delete_data_button=0&other_text=tall");
  });

  it("includes the native size only for MANUAL", () => {
    const hash = formatSettings({ ...kDefaultSettings, aspectRatioMethod: "MANUAL" });
    expect(hash).toContain("&native_width=576&native_height=435&");
  });

  it("includes a non-default interactive first, encoded", () => {
    const interactive = "https://example.com/i.html?a=1&b=2";
    const hash = formatSettings({ ...kDefaultSettings, interactive });
    expect(hash.startsWith("#interactive=")).toBe(true);
    expect(parseSettings(hash).interactive).toBe(interactive);
  });
});

describe("layout helpers", () => {
  it("isTwoColumnLayout is false only for the single-column layouts", () => {
    expect(kSectionLayouts.filter(l => !isTwoColumnLayout(l))).toEqual(["full-width", "responsive-full-width"]);
  });

  it("isResponsiveLayout is true only for the responsive layouts", () => {
    expect(kSectionLayouts.filter(isResponsiveLayout)).toEqual(
      ["responsive-30-70", "responsive-50-50", "responsive-full-width"]);
  });
});
