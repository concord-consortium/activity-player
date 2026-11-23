import {
  Activity, EmbeddableType, IEmbeddableXhtml, IManagedInteractive, IMwInteractive, LibraryInteractiveData
} from "../types";
import { ActivityLayouts } from "../utilities/activity-utils";
import { isTwoColumnLayout, ISizingSettings } from "./settings";

export const kInteractiveName = "Sizing interactive";
export const kInteractiveRefId = "sizing-interactive";
const kOtherTextRefId = "sizing-other-text";

// LARA's defaults for a library interactive's size.
const kLaraDefaultAspectRatioMethod = "DEFAULT";
const kLaraDefaultNativeWidth = 576;
const kLaraDefaultNativeHeight = 435;

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

function buildInteractive(settings: ISizingSettings, column: "primary" | "secondary"): EmbeddableType {
  const name = settings.named ? kInteractiveName : "";
  const common = { column, is_hidden: false, is_half_width: false, name, ref_id: kInteractiveRefId };

  if (settings.kind === "mw") {
    const mw: IMwInteractive = {
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
    return mw;
  }

  const inherits = settings.kind === "library";
  const managed: IManagedInteractive = {
    ...common,
    type: "ManagedInteractive",
    library_interactive: { hash: "sizing-preview", data: libraryData(settings, inherits) },
    inherit_aspect_ratio_method: inherits,
    inherit_native_width: inherits,
    inherit_native_height: inherits,
    // The types don't allow null for the custom size, but LARA exports null when inheriting.
    custom_aspect_ratio_method: inherits ? null : settings.aspectRatioMethod,
    custom_native_width: (inherits ? null : settings.nativeWidth) as number,
    custom_native_height: (inherits ? null : settings.nativeHeight) as number
  };
  return managed;
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
