import { types } from "mobx-state-tree";

export const EmbeddableModel = types
  .model("Embeddable", {
    type: types.enumeration(["ManagedInteractive", "MwInteractive"]),
    name: types.maybeNull(types.string),
    url_fragment: types.maybeNull(types.string),
    authored_state: types.maybeNull(types.string),
    is_hidden: types.boolean,
    is_full_width: types.boolean,
    show_in_featured_question_report: types.boolean,
    inherit_aspect_ratio_method: types.boolean,
    custom_aspect_ratio_method: types.maybeNull(types.literal("DEFAULT")),
    inherit_native_width: types.boolean,
    custom_native_width: types.number,
    inherit_native_height: types.boolean,
    custom_native_height: types.number,
    inherit_click_to_play: types.boolean,
    custom_click_to_play: types.boolean,
    inherit_full_window: types.boolean,
    custom_full_window: types.boolean,
    inherit_click_to_play_prompt: types.boolean,
    custom_click_to_play_prompt: types.maybeNull(types.string),
    inherit_image_url: types.boolean,
    custom_image_url: types.maybeNull(types.string),
    ref_id: types.string,
    library_interactive: types.model("LibraryInteractiveModel", {
      hash: types.string,
      data: types.model("LibraryInteractiveDataModel", {
        aspect_ratio_method: types.maybeNull(types.literal("DEFAULT")),
        authoring_guidance: types.maybeNull(types.string),
        base_url: types.string,
        click_to_play: types.boolean,
        click_to_play_prompt: types.maybeNull(types.string),
        description: types.maybeNull(types.string),
        enable_learner_state: types.boolean,
        full_window: types.boolean,
        has_report_url: types.boolean,
        image_url: types.maybeNull(types.string),
        name: types.maybeNull(types.string),
        native_height: types.number,
        native_width: types.number,
        no_snapshots: types.boolean,
        show_delete_data_button: types.boolean,
        thumbnail_url: types.maybeNull(types.string),
        customizable: types.boolean,
        authorable: types.boolean,
      })
    }),
  });

export type EmbeddableModelType = typeof EmbeddableModel.Type;

export const EmbeddableWrapperModel = types
  .model("EmbeddableWrapper", {
    section: types.maybeNull(types.enumeration(["header_block", "interactive_box"])),
    embeddable: EmbeddableModel,
  });

export type EmbeddableWrapperModelType = typeof EmbeddableWrapperModel.Type;
