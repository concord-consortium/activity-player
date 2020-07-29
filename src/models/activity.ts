import { types } from "mobx-state-tree";
import { PageModel } from "./page";

export const ActivityModel = types
  .model("Activity", {
    description: types.maybeNull(types.string),
    editor_mode: types.number,
    layout: types.number,
    name: types.maybeNull(types.string),
    notes: types.maybeNull(types.string),
    project_id: types.maybeNull(types.number),
    related: types.maybeNull(types.string),
    show_submit_button: types.boolean,
    student_report_enabled: types.boolean,
    thumbnail_url: types.maybeNull(types.string),
    time_to_complete: types.number,
    version: types.number,
    theme_name: types.maybeNull(types.string),
    plugins: types.array(types.literal(null)),      // update when we add plugin support
    type: types.literal("LightweightActivity"),
    export_site: types.maybeNull(types.string),
    pages: types.array(PageModel),
  });

export type ActivityModelType = typeof ActivityModel.Type;
