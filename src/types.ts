export type Mode = "runtime" | "authoring" | "report";

export interface IframePhone {
  post: (type: string, data: any) => void;
  addListener: (type: string, handler: (data: any) => void) => void;
  initialize: () => void;
  disconnect: () => void;
}

export interface LibraryInteractive {
  hash: string;
  data: {
    aspect_ratio_method?: "DEFAULT" | null;
    authoring_guidance?: string;
    base_url: string;
    url?: string;
    click_to_play: boolean;
    click_to_play_prompt?: string | null;
    description?: string;
    enable_learner_state: boolean;
    full_window: boolean;
    has_report_url: boolean;
    image_url?: string | null;
    name?: string;
    native_height: number;
    native_width: number;
    no_snapshots: boolean;
    show_delete_data_button: boolean;
    thumbnail_url?: string;
    customizable: boolean;
    authorable: boolean;
  }
}

// This could in theory be split into three types, with a Base and a union Embeddable type.
// This makes some of the component code a lot more messy. It may still be worth it, though.
export interface Embeddable {
  type: "ManagedInteractive" | "MwInteractive" | "Embeddable::Xhtml";
  name: string;
  authored_state?: string | null;
  interactiveState?: any | null;
  url_fragment?: string | null,
  is_hidden: boolean;
  is_full_width: boolean;
  ref_id: string;
  library_interactive?: LibraryInteractive;         // ManagedInteractive
  show_in_featured_question_report?: boolean;       //    "
  inherit_aspect_ratio_method?: boolean;            //    v
  custom_aspect_ratio_method?: "DEFAULT" | null;
  inherit_native_width?: boolean;
  custom_native_width?: number;
  inherit_native_height?: boolean;
  custom_native_height?: number;
  inherit_click_to_play?: boolean;
  custom_click_to_play?: boolean;
  inherit_full_window?: boolean;
  custom_full_window?: boolean;
  inherit_click_to_play_prompt?: boolean;
  custom_click_to_play_prompt?: string | null
  inherit_image_url?: boolean;
  custom_image_url?: string | null;
  base_url?: string;                                // non-ManagedInteractive
  url?: string;                                     //  "
  native_height?: number;                           //  "
  native_width?: number;                            //  "
  content?: string;                                 // Embeddable::Xhtml
  enable_learner_state?: boolean;                   // MwInteractive
}

export interface EmbeddableWrapper {
  section: "header_block" | "interactive_box" | null;
  embeddable: Embeddable;
}

interface Section {}

export interface Page {
  embeddable_display_mode: "stacked" | "carousel";
  text?: string;
  is_completion: boolean;
  is_hidden: boolean;
  layout: string;
  name?: string | null;
  position: number,
  show_header?: boolean;
  show_info_assessment: boolean;
  show_interactive: boolean;
  show_sidebar: boolean;
  sidebar: string | null;
  sidebar_title: string | null;
  toggle_info_assessment: boolean;
  additional_sections: Section;        // update when we support additional sections
  embeddables: EmbeddableWrapper[];
}

export interface Activity {
  description: string | null;
  editor_mode: number;
  layout: number;
  name: string;
  notes?: string | null;
  project_id: number | null;
  related?: string | null;
  show_submit_button: boolean;
  student_report_enabled: boolean;
  thumbnail_url: string | null;
  time_to_complete: number | null;
  version: number;
  theme_name?: string | null;
  plugins: null[];      // update when we add plugin support
  type: "LightweightActivity";
  export_site?: string | null;
  pages: Page[];
}
