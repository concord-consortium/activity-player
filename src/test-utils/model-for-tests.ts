import { EmbeddableType, SectionType, Page, Activity, LibraryInteractive, IManagedInteractive, IEmbeddableXhtml, IEmbeddablePlugin } from "../types";

export const DefaultTestEmbeddable: EmbeddableType = {
  type: "MwInteractive",
  name: "name",
  is_hidden: false,
  is_half_width: true,
  ref_id: "abc",
};

export const DefaultTestSection: SectionType = {
  secondary_column_display_mode: "stacked",
  is_hidden: false,
  secondary_column_collapsible: true,
  embeddables: [],
  layout: "l-6040"
};

export const DefaultTestPage: Page = {
  is_completion: false,
  is_hidden: false,
  position: 0,
  show_sidebar: false,
  sidebar: null,
  sidebar_title: null,
  sections: [],
  id: 1000
};

export const DefaultTestActivity: Activity = {
  description: null,
  editor_mode: 0,
  layout: 0,
  name: "name",
  project: {
    about: "",
    collaborators: "",
    collaborators_image_url: "",
    contact_email: "",
    copyright: "",
    copyright_image_url: "",
    footer: "",
    funders_image_url: "",
    logo_ap: "",
    logo_lara: "",
    project_key: "default",
    title: "Default",
    url: ""
  },
  show_submit_button: false,
  student_report_enabled: false,
  thumbnail_url: null,
  time_to_complete: null,
  version: 1,
  plugins: [],
  type: "LightweightActivity",
  pages: [],
  font_size: "normal"
};

export const DefaultLibraryInteractive: LibraryInteractive = {
  hash: "",
  data: {
    base_url: "",
    click_to_play: false,
    enable_learner_state: true,
    full_window: false,
    has_report_url: false,
    native_height: 1,
    native_width: 1,
    no_snapshots: false,
    show_delete_data_button: false,
    customizable: false,
    authorable: false
  }
};

export const DefaultManagedInteractive: IManagedInteractive = {
  library_interactive: DefaultLibraryInteractive,
  type: "ManagedInteractive",
  ref_id: "",
  name: "",
  is_hidden: false,
  is_half_width: false
};

export const DefaultXhtmlComponent: IEmbeddableXhtml = {
  content: "<p>This is a text component.</p>",
  name: "",
  type: "Embeddable::Xhtml",
  ref_id: "123-Embeddable::Xhtml",
  is_hidden: false,
  is_half_width: false,
  is_callout: true
};

export const DefaultTEWindowshadeComponent: IEmbeddablePlugin = {
  type: "Embeddable::EmbeddablePlugin",
  ref_id: "123-Embeddable::EmbeddablePlugin",
  is_hidden: false,
  is_half_width: false,
  plugin: {
    id: 12,
    description: null,
    author_data: "{\"tipType\":\"windowShade\",\"windowShade\":{\"windowShadeType\":\"theoryAndBackground\",\"layout\":\"mediaLeft\",\"initialOpenState\":true,\"content\":\"this is a windowshade\",\"content2\":\"\",\"mediaType\":\"none\",\"mediaCaption\":\"Last, First. \\\"Title of Work.\\\" Year created. Site Title [OR] Publisher. Gallery [OR] Location. http://www.url.com.\",\"mediaURL\":\"\"}}",
    approved_script_label: "teacherEditionTips",
    component_label: "windowShade",
    approved_script: {
      name: "Teacher Edition",
      url: "https://example.com/plugin.js",
      label: "teacherEditionTips",
      description: "Teacher Edition Plugin",
      version: "1.0.0",
      json_url: "https://example.com/manifest.json",
      authoring_metadata: "{}"
    }
  }
};
