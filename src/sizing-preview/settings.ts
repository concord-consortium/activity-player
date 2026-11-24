import { isHttpUrl } from "../utilities/url-utils";

export const kFixedWidthLayouts = ["1100px", "ipad_friendly"] as const;
export const kSectionLayouts = ["full-width", "60-40", "40-60", "70-30", "30-70",
  "responsive-30-70", "responsive-50-50", "responsive-full-width"] as const;
export const kColumns = ["primary", "secondary"] as const;
export const kInteractiveKinds = ["mw", "library", "library-custom"] as const;
export const kAspectRatioMethods = ["DEFAULT", "MANUAL", "MAX"] as const;
export const kOtherTexts = ["tall", "short"] as const;

export type FixedWidthLayout = typeof kFixedWidthLayouts[number];
export type SectionLayout = typeof kSectionLayouts[number];
export type Column = typeof kColumns[number];
export type InteractiveKind = typeof kInteractiveKinds[number];
export type AspectRatioMethod = typeof kAspectRatioMethods[number];
export type OtherText = typeof kOtherTexts[number];

export interface ISizingSettings {
  interactive: string;
  fixedWidthLayout: FixedWidthLayout;
  layout: SectionLayout;
  column: Column;
  kind: InteractiveKind;
  aspectRatioMethod: AspectRatioMethod;
  nativeWidth: number;
  nativeHeight: number;
  named: boolean;
  clearButton: boolean;
  otherText: OtherText;
}

export const kDefaultInteractiveUrl = "https://models-resources.concord.org/sizing-demo-interactive/index.html";

// LARA's defaults for a library interactive's size.
export const kLaraDefaultNativeWidth = 576;
export const kLaraDefaultNativeHeight = 435;

export const kDefaultSettings: ISizingSettings = {
  interactive: kDefaultInteractiveUrl,
  fixedWidthLayout: "1100px",
  layout: "full-width",
  column: "primary",
  kind: "library",
  aspectRatioMethod: "DEFAULT",
  nativeWidth: kLaraDefaultNativeWidth,
  nativeHeight: kLaraDefaultNativeHeight,
  named: true,
  clearButton: false,
  otherText: "tall"
};

export function isTwoColumnLayout(layout: SectionLayout): boolean {
  return layout !== "full-width" && layout !== "responsive-full-width";
}

export function isResponsiveLayout(layout: SectionLayout): boolean {
  return layout.includes("responsive");
}

const oneOf = <T extends string>(values: readonly T[], value: string | null, fallback: T): T =>
  values.find(v => v === value) ?? fallback;

const positiveInt = (value: string | null, fallback: number): number => {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const n = Number(value);
  return n > 0 ? n : fallback;
};

const flag = (value: string | null, fallback: boolean): boolean =>
  value === "1" ? true : value === "0" ? false : fallback;

export function parseSettings(hash: string): ISizingSettings {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const d = kDefaultSettings;
  const interactive = params.get("interactive");
  return {
    interactive: interactive !== null && isHttpUrl(interactive) ? interactive : d.interactive,
    fixedWidthLayout: oneOf(kFixedWidthLayouts, params.get("fixed_width_layout"), d.fixedWidthLayout),
    layout: oneOf(kSectionLayouts, params.get("layout"), d.layout),
    column: oneOf(kColumns, params.get("column"), d.column),
    kind: oneOf(kInteractiveKinds, params.get("kind"), d.kind),
    aspectRatioMethod: oneOf(kAspectRatioMethods, params.get("aspect_ratio_method"), d.aspectRatioMethod),
    nativeWidth: positiveInt(params.get("native_width"), d.nativeWidth),
    nativeHeight: positiveInt(params.get("native_height"), d.nativeHeight),
    named: flag(params.get("name"), d.named),
    clearButton: flag(params.get("show_delete_data_button"), d.clearButton),
    otherText: oneOf(kOtherTexts, params.get("other_text"), d.otherText)
  };
}

// Writes only the settings that apply, in the order of the README's hash table.
export function formatSettings(settings: ISizingSettings): string {
  const params = new URLSearchParams();
  const twoColumn = isTwoColumnLayout(settings.layout);
  if (settings.interactive !== kDefaultInteractiveUrl) params.set("interactive", settings.interactive);
  params.set("fixed_width_layout", settings.fixedWidthLayout);
  params.set("layout", settings.layout);
  if (twoColumn) params.set("column", settings.column);
  params.set("kind", settings.kind);
  params.set("aspect_ratio_method", settings.aspectRatioMethod);
  if (settings.aspectRatioMethod === "MANUAL") {
    params.set("native_width", String(settings.nativeWidth));
    params.set("native_height", String(settings.nativeHeight));
  }
  params.set("name", settings.named ? "1" : "0");
  params.set("show_delete_data_button", settings.clearButton ? "1" : "0");
  if (twoColumn) params.set("other_text", settings.otherText);
  return `#${params.toString()}`;
}
