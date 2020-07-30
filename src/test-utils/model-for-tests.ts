import { Embeddable, EmbeddableWrapper, Page, Activity } from "../types";

export const DefaultTestEmbeddable: Embeddable = {
  type: "MwInteractive",
  name: "name",
  is_hidden: false,
  is_full_width: true,
  ref_id: "abc",
};

export const DefaultTestEmbeddableWrapper: EmbeddableWrapper = {
  section: null,
  embeddable: DefaultTestEmbeddable,
};

export const DefaultTestPage: Page = {
  embeddable_display_mode: "stacked",
  is_completion: false,
  is_hidden: false,
  layout: "l-6040",
  position: 0,
  show_info_assessment: false,
  show_interactive: true,
  show_sidebar: false,
  sidebar: null,
  sidebar_title: null,
  toggle_info_assessment: false,
  additional_sections: {},
  embeddables: [],
};

export const DefaultTestActivity: Activity = {
  description: null,
  editor_mode: 0,
  layout: 0,
  name: "name",
  project_id: null,
  show_submit_button: false,
  student_report_enabled: false,
  thumbnail_url: null,
  time_to_complete: null,
  version: 1,
  plugins: [],
  type: "LightweightActivity",
  pages: [],
};
