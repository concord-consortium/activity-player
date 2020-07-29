import { types } from "mobx-state-tree";
import { EmbeddableWrapperModel } from "./embeddable";

export const PageModel = types
  .model("Page", {
    embeddable_display_mode: types.enumeration(["stacked", "carousel"]),
    is_completion: types.boolean,
    is_hidden: types.boolean,
    layout: types.maybeNull(types.string),
    name: types.maybeNull(types.string),
    position: types.number,
    show_header: types.boolean,
    show_info_assessment: types.boolean,
    show_interactive: types.boolean,
    show_sidebar: types.boolean,
    sidebar: types.maybeNull(types.string),
    sidebar_title: types.maybeNull(types.string),
    toggle_info_assessment: types.boolean,
    additional_sections: types.frozen({}),        // update when we support additional sections
    embeddables: types.array(EmbeddableWrapperModel),
  });

export type PageModelType = typeof PageModel.Type;
