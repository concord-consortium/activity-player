// The size the Activity Player (AP) gives an interactive's iframe, for the settings an author picks
// in LARA. It copies the AP's CSS and its use-aspect-ratio hook, so when the AP changes, this
// changes. References name the CSS selector, function or variable and its file.
//
// Ported from Neural Pathways' `src/ap-preview/ap-sizing.ts` on its NPW-75-ap-preview-page branch
// (3afb8a1), which was checked against the AP's 3a38f74d and the measurements in that branch's
// `src/ap-preview/measurements.md`. The port leaves out the explanation and warning text NPW's page
// shows, and adds the interactive's kind, its name and the "Clear & start over" button. It was
// checked against the AP at 4c292cf0.
//
// It assumes a Multiple Pages activity, and an interactive that doesn't send the AP an aspect ratio
// or a height.

export const FIXED_WIDTH_LAYOUTS = ["1100px", "ipad_friendly"] as const;
export type FixedWidthLayout = typeof FIXED_WIDTH_LAYOUTS[number];
export const SECTION_LAYOUTS = [
  "full-width", "60-40", "40-60", "70-30", "30-70", "responsive-30-70", "responsive-50-50", "responsive-full-width",
] as const;
export type SectionLayout = typeof SECTION_LAYOUTS[number];
export const COLUMNS = ["primary", "secondary"] as const;
export type Column = typeof COLUMNS[number];
/**
 * `mw` is a basic iframe interactive; `library` is a managed interactive that inherits its size from
 * its library interactive; `library-custom` is one that sets its size with Customize.
 */
export const KINDS = ["mw", "library", "library-custom"] as const;
export type Kind = typeof KINDS[number];
export const ASPECT_RATIO_METHODS = ["DEFAULT", "MANUAL", "MAX"] as const;
export type AspectRatioMethod = typeof ASPECT_RATIO_METHODS[number];

export interface ApSettings {
  fixedWidthLayout: FixedWidthLayout;
  layout: SectionLayout;
  /** The column the interactive is in. Ignored for single-column layouts. */
  column: Column;
  kind: Kind;
  aspectRatioMethod: AspectRatioMethod;
  /** `native_width` and `native_height`, used only by MANUAL. */
  nativeWidth: number;
  nativeHeight: number;
  /** The interactive has a name. */
  named: boolean;
  /** "Clear & start over" shows under the iframe. */
  clearButton: boolean;
}

export interface ApWindow {
  /** The AP's `#app` width: the window's, less a classic scrollbar. */
  width: number;
  /** `window.innerHeight`. */
  height: number;
  /** The "Clear & start over" button's box height plus its 5 px bottom margin; 0 when it's off. */
  clearButtonHeight: number;
}

export interface ApSize {
  /** The width of the interactive's column. */
  columnWidth: number;
  iframeWidth: number;
  iframeHeight: number;
}

// LARA's default native size (`ASPECT_RATIO_DEFAULT_WIDTH` and `_HEIGHT` in LARA's
// has_aspect_ratio.rb), used when the native size can't be divided by.
const DEFAULT_NATIVE_WIDTH = 576;
const DEFAULT_NATIVE_HEIGHT = 435;
// `kDefaultAspectRatio` and `kBottomMargin` in use-aspect-ratio.ts, and `kDefaultHeight` in
// iframe-runtime.tsx.
const DEFAULT_ASPECT_RATIO = 4 / 3;
const BOTTOM_MARGIN = 15;
const DEFAULT_IFRAME_HEIGHT = 300;
// `deleteDataButtonHeight` in use-aspect-ratio.ts: what the DEFAULT height cap leaves for "Clear &
// start over" when the hook is told the button shows.
const DELETE_DATA_BUTTON_HEIGHT = 44;
// Under the iframe, the margins of the div that holds "Clear & start over" and teacher feedback
// (`.iframe-runtime-buttons` in iframe-runtime.scss); the title bar (`.embeddable .header` in
// embeddable.scss); a 1 px border, top and bottom (`.runtime-container.has-border` in
// managed-interactive.scss). The border sits outside the runtime container's 100% width, so it
// doesn't narrow the iframe.
const BELOW_IFRAME_HEIGHT = 30;
const HEADER_HEIGHT = 36;
const BORDER = 2;

export function isResponsive(layout: SectionLayout): boolean {
  return layout.includes("responsive");
}

export function isTwoColumn(layout: SectionLayout): boolean {
  return layout !== "full-width" && layout !== "responsive-full-width";
}

function columnWidths(settings: ApSettings, windowWidth: number): { primary: number; secondary: number | null } {
  const { layout } = settings;
  const W = windowWidth;
  if (isResponsive(layout)) {
    // The page is the window less the `.app`'s 40 px padding each side (app.scss) and the page's
    // 20 px each side (`.page-content` in activity-page-content.scss). The section is 100% of that;
    // its 8 px margin overflows instead of narrowing it (`.section` and `.section.responsive` in
    // section.scss).
    const section = W - 120;
    if (layout === "responsive-full-width") {
      // The embeddable's 20 px right margin (`.section.responsive .embeddable.full-width > div` in
      // section.scss).
      return { primary: section - 20, secondary: null };
    }
    if (layout === "responsive-30-70") {
      // A 365 px secondary column, a 10 px gap, and the primary's 20 px right margin
      // (`.section.responsive .column.primary` and `.column.secondary` in section.scss).
      return { primary: section - 365 - 10 - 20, secondary: 365 };
    }
    // responsive-50-50: each column 50% of the section; the primary loses the 10 px gap and its 20 px
    // right margin (the `.responsive-50-50` columns under `.section.responsive` in section.scss).
    const half = section / 2;
    return { primary: half - 30, secondary: half };
  }

  // A fixed page: its padding (`.page-content`) and the section's margin (`.section`) take 56 px. The
  // `.app`'s padding sits outside the page, so the window's width doesn't matter.
  const pageWidth = settings.fixedWidthLayout === "ipad_friendly" ? 960 : 1100;
  const C = pageWidth - 56;
  if (layout === "full-width") {
    return { primary: C, secondary: null };
  }
  if (layout === "60-40" || layout === "70-30") {
    // 10 equal columns with 10 px gaps (`.section` in section.scss); the primary spans 6 or 7.
    const span = (n: number) => n * (C - 90) / 10 + 10 * (n - 1);
    const primarySpan = layout === "60-40" ? 6 : 7;
    return { primary: span(primarySpan), secondary: span(10 - primarySpan) };
  }
  // 40-60 and 30-70: minmax(45px, auto) then 9 × 1fr, with 10 px gaps (`.section.r_4060` and
  // `.section.r_3070` in section.scss). The secondary's span includes the 45 px track.
  const fr = (C - 135) / 9;
  const p = layout === "40-60" ? 6 : 7;
  const s = 10 - p;
  return { primary: p * fr + 10 * (p - 1), secondary: 45 + (s - 1) * fr + 10 * (s - 1) };
}

/**
 * Whether "Use all available space" (MAX) stretches the iframe to 98vh in the AP today. CSS does it
 * in a full-width section (`.section.full-width .embeddable.full-width.max-aspect-ratio` in
 * section.scss), for every kind: `hasMaxAspectRatio` in embeddable.tsx reads the library
 * interactive's setting when the embed inherits it. It does it in a primary column
 * (`.column.primary.max-aspect-ratio` in section.scss) only when `renderPrimaryEmbeddables` in
 * section.tsx adds that class, which reads `custom_aspect_ratio_method` for a managed interactive
 * and `aspect_ratio_method` for a basic one, so not for `library`. That selector isn't limited to the
 * fixed layouts, so it applies to the primary column of responsive-30-70 and responsive-50-50 too.
 * Nothing stretches it in a responsive-full-width section, which has no columns, or in a secondary
 * column.
 */
function maxStretches(settings: ApSettings, column: Column): boolean {
  if (settings.layout === "full-width") return true;
  if (!isTwoColumn(settings.layout) || column === "secondary") return false;
  return settings.kind !== "library";
}

interface SizeRules {
  /** MAX stretches the iframe wherever the setting applies, not only where the AP stretches it today. */
  maxStretchesEverywhere: boolean;
  /** The DEFAULT height cap leaves room for "Clear & start over" when it shows. */
  defaultCapLeavesRoomForButton: boolean;
}

function size(settings: ApSettings, window: ApWindow, rules: SizeRules): ApSize {
  const cols = columnWidths(settings, window.width);
  const column: Column = isTwoColumn(settings.layout) ? settings.column : "primary";
  const D = Math.max(0, column === "primary" ? cols.primary : cols.secondary ?? 0);

  let iframeWidth = D;
  let iframeHeight: number;
  // `maxHeight` and `unusableHeight` in use-aspect-ratio.ts. The header term in `unusableHeight` is
  // always 0: managed-interactive.tsx never attaches `headerTarget` to an element. It also passes
  // `showDeleteDataButton: false`, so the AP leaves the button out of the DEFAULT cap today.
  const M = 0.98 * window.height;

  if (settings.aspectRatioMethod === "MANUAL") {
    // The MANUAL case in use-aspect-ratio.ts: the native ratio of the width, with no cap.
    const valid = settings.nativeWidth > 0 && settings.nativeHeight > 0;
    const nw = valid ? settings.nativeWidth : DEFAULT_NATIVE_WIDTH;
    const nh = valid ? settings.nativeHeight : DEFAULT_NATIVE_HEIGHT;
    iframeHeight = D * nh / nw;
  } else if (settings.aspectRatioMethod === "DEFAULT") {
    // The DEFAULT case in use-aspect-ratio.ts, with the interactive sending no aspect ratio: 4:3.
    const buttonRoom = rules.defaultCapLeavesRoomForButton && settings.clearButton ? DELETE_DATA_BUTTON_HEIGHT : 0;
    const cap = M - BOTTOM_MARGIN - buttonRoom;
    if (D / DEFAULT_ASPECT_RATIO <= cap) {
      iframeHeight = D / DEFAULT_ASPECT_RATIO;
    } else {
      iframeHeight = cap;
      // The width is narrowed from M, not from the cap.
      iframeWidth = Math.min(D, M * DEFAULT_ASPECT_RATIO);
    }
  } else if (rules.maxStretchesEverywhere || maxStretches(settings, column)) {
    // MAX, stretched: `iframe { flex: 1 }` fills the 98vh embeddable, less what is around the
    // iframe. The title bar shows when the interactive has a name or a question number
    // (`hideQuestionHeader` in managed-interactive.tsx); with "Clear & start over" on, the
    // interactive saves state, so it is a numbered question. Every managed interactive has the
    // border, and a basic one has it only with the title bar (`hasBorder` in
    // managed-interactive.tsx). The button and its bottom margin (`.iframe-runtime button.button`
    // in iframe-runtime.scss) sit in the div under the iframe.
    const hasHeader = settings.named || settings.clearButton;
    const hasBorder = settings.kind !== "mw" || hasHeader;
    iframeHeight = M - BELOW_IFRAME_HEIGHT - (hasHeader ? HEADER_HEIGHT : 0) - (hasBorder ? BORDER : 0) -
      (settings.clearButton ? window.clearButtonHeight : 0);
  } else {
    // MAX, not stretched: the iframe keeps its 300 px height attribute.
    iframeHeight = DEFAULT_IFRAME_HEIGHT;
  }

  return { columnWidth: D, iframeWidth: Math.max(0, iframeWidth), iframeHeight: Math.max(0, iframeHeight) };
}

/** The size the AP gives the iframe today. */
export function apSize(settings: ApSettings, window: ApWindow): ApSize {
  return size(settings, window, { maxStretchesEverywhere: false, defaultCapLeavesRoomForButton: false });
}

/**
 * The size the iframe should have, where that differs from what the AP does today:
 * - "Use all available space" stretches the iframe in a responsive-full-width section, in a
 *   secondary column, and in a primary column whose embed inherits the setting, to the same height
 *   as in a full-width section. The AP leaves it at 300 px there.
 * - With "Clear & start over" on, the DEFAULT height cap is 44 px lower, leaving room for the button,
 *   as it was before managed-interactive.tsx started passing `showDeleteDataButton: false`.
 */
export function apSizeAsSpecified(settings: ApSettings, window: ApWindow): ApSize {
  return size(settings, window, { maxStretchesEverywhere: true, defaultCapLeavesRoomForButton: true });
}
