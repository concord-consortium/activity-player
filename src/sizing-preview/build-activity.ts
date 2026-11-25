import {
  Activity, EmbeddableType, IEmbeddableXhtml, IManagedInteractive, IMwInteractive, LibraryInteractiveData
} from "../types";
import { ActivityLayouts } from "../utilities/activity-utils";
import { isTwoColumnLayout, ISizingSettings, kLaraDefaultNativeHeight, kLaraDefaultNativeWidth } from "./settings";

export const kInteractiveName = "Sizing interactive";
export const kInteractiveRefId = "sizing-interactive";
const kOtherTextRefId = "sizing-other-text";

// LARA's default for a library interactive's aspect ratio method.
const kLaraDefaultAspectRatioMethod = "DEFAULT";

const kFillerParagraph = "This is placeholder text for the other column. It doesn't explain anything. " +
  "It is here to make the column as tall as a real activity's text would be, so the page can be " +
  "taller than the window and the interactive's pinning can be seen working. Keep scrolling to see " +
  "how the interactive behaves next to text that keeps going.";
const kTallParagraphCount = 25;

function otherColumnContent(settings: ISizingSettings) {
  const count = settings.otherText === "tall" ? kTallParagraphCount : 1;
  return Array.from({ length: count }, () => `<p>${kFillerParagraph}</p>`).join("\n");
}

function libraryData(settings: ISizingSettings, useSettingsForSize: boolean): LibraryInteractiveData {
  return {
    base_url: settings.interactive,
    aspect_ratio_method: useSettingsForSize ? settings.aspectRatioMethod : kLaraDefaultAspectRatioMethod,
    native_width: useSettingsForSize ? settings.nativeWidth : kLaraDefaultNativeWidth,
    native_height: useSettingsForSize ? settings.nativeHeight : kLaraDefaultNativeHeight,
    enable_learner_state: settings.clearButton,
    show_delete_data_button: settings.clearButton,
    click_to_play: false,
    full_window: false,
    has_report_url: false,
    no_snapshots: false,
    customizable: false,
    authorable: false
  };
}

type CommonFields = Pick<IManagedInteractive, "column" | "is_hidden" | "is_half_width" | "name" | "ref_id">;

function buildMwInteractive(settings: ISizingSettings, common: CommonFields): IMwInteractive {
  return {
    ...common,
    type: "MwInteractive",
    url: settings.interactive,
    aspect_ratio_method: settings.aspectRatioMethod,
    native_width: settings.nativeWidth,
    native_height: settings.nativeHeight,
    enable_learner_state: settings.clearButton,
    show_delete_data_button: settings.clearButton,
    click_to_play: false
  };
}

/**
 * With `inheritsSize`, the size settings go on the library interactive and the embed inherits them.
 * Without it, the library interactive keeps LARA's defaults and the embed sets the size itself, as
 * Customize does.
 */
function buildManagedInteractive(
  settings: ISizingSettings, common: CommonFields, inheritsSize: boolean
): IManagedInteractive {
  return {
    ...common,
    type: "ManagedInteractive",
    library_interactive: { hash: "sizing-preview", data: libraryData(settings, inheritsSize) },
    inherit_aspect_ratio_method: inheritsSize,
    inherit_native_width: inheritsSize,
    inherit_native_height: inheritsSize,
    // The types don't allow null for the custom size, but LARA exports null when inheriting.
    custom_aspect_ratio_method: inheritsSize ? null : settings.aspectRatioMethod,
    custom_native_width: (inheritsSize ? null : settings.nativeWidth) as number,
    custom_native_height: (inheritsSize ? null : settings.nativeHeight) as number
  };
}

function buildInteractive(settings: ISizingSettings, column: "primary" | "secondary"): EmbeddableType {
  const name = settings.named ? kInteractiveName : "";
  const common: CommonFields = { column, is_hidden: false, is_half_width: false, name, ref_id: kInteractiveRefId };

  switch (settings.kind) {
    case "mw":
      return buildMwInteractive(settings, common);
    case "library":
      return buildManagedInteractive(settings, common, true);
    case "library-custom":
      return buildManagedInteractive(settings, common, false);
  }
}

export function buildActivity(settings: ISizingSettings): Activity {
  const twoColumn = isTwoColumnLayout(settings.layout);
  const interactiveColumn = twoColumn ? settings.column : "primary";
  const embeddables: EmbeddableType[] = [buildInteractive(settings, interactiveColumn)];

  if (twoColumn) {
    const otherText: IEmbeddableXhtml = {
      type: "Embeddable::Xhtml",
      column: interactiveColumn === "primary" ? "secondary" : "primary",
      is_hidden: false,
      is_half_width: false,
      is_callout: false,
      name: "",
      ref_id: kOtherTextRefId,
      content: otherColumnContent(settings)
    };
    embeddables.push(otherText);
  }

  return {
    version: 2,
    layout: ActivityLayouts.MultiplePages,
    fixed_width_layout: settings.fixedWidthLayout,
    plugins: [],
    font_size: "normal",
    name: "Sizing preview",
    type: "LightweightActivity",
    description: null,
    editor_mode: 0,
    show_submit_button: false,
    student_report_enabled: false,
    thumbnail_url: null,
    time_to_complete: null,
    pages: [{
      id: 1,
      position: 1,
      is_hidden: false,
      is_completion: false,
      show_sidebar: false,
      sidebar: null,
      sidebar_title: null,
      sections: [{
        layout: settings.layout,
        secondary_column_display_mode: "stacked",
        secondary_column_collapsible: false,
        is_hidden: false,
        embeddables
      }]
    }]
  };
}
