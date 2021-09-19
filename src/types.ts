import { IReadableAttachmentInfo } from "@concord-consortium/interactive-api-host";

export type Mode = "runtime" | "authoring" | "report";

export interface IframePhone {
  post: (type: string, data?: any) => void;
  addListener: (type: string, handler: (data: any) => void) => void;
  initialize: () => void;
  disconnect: () => void;
}

export interface LibraryInteractiveData {
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

export interface LibraryInteractive {
  hash: string;
  data: LibraryInteractiveData;
}

export interface ApprovedScript {
  name: string;
  url: string;
  label: string;
  description: string;
  version: string;
  json_url: string;
  authoring_metadata: string;
}

export interface Plugin {
  id: number;
  description: string | null;
  author_data: string;
  approved_script_label: string;
  component_label: string;
  approved_script: ApprovedScript;
}

export interface EmbeddableBase {
  type: string;
  name?: string;
  authored_state?: string | null;
  interactiveState?: any | null;
  url_fragment?: string | null,
  is_hidden: boolean;
  is_full_width: boolean;
  ref_id: string;
  embeddable_ref_id?: string;
}

export interface IManagedInteractive extends EmbeddableBase {
  type: "ManagedInteractive";
  library_interactive: LibraryInteractive | null;
  show_in_featured_question_report?: boolean;
  inherit_aspect_ratio_method?: boolean;
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
  linked_interactives?: { ref_id: string, label: string }[];
}

export interface IMwInteractive extends EmbeddableBase {
  type: "MwInteractive";
  base_url?: string;
  url?: string;
  native_height?: number;
  native_width?: number;
  enable_learner_state?: boolean;
  linked_interactives?: { ref_id: string, label: string }[];
}

export interface IEmbeddableXhtml extends EmbeddableBase {
  type: "Embeddable::Xhtml";
  content?: string;
  is_callout?: boolean;
}

export interface IEmbeddablePlugin extends EmbeddableBase {
  type: "Embeddable::EmbeddablePlugin";
  plugin?: Plugin;
}

export type Embeddable = IManagedInteractive | IMwInteractive | IEmbeddableXhtml | IEmbeddablePlugin;

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
  id: number;
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

export interface Project {
  about: string | null;
  footer: string | null;
  help: string | null;
  logo_ap: string | null;
  logo_lara: string | null;
  project_key: string;
  title: string | null;
  url: string | null;
}

export interface Activity {
  id?: number | null;
  description: string | null;
  editor_mode: number;
  layout: number;
  name: string;
  notes?: string | null;
  project?: Project | null;
  related?: string | null;
  show_submit_button: boolean;
  student_report_enabled: boolean;
  thumbnail_url: string | null;
  time_to_complete: number | null;
  version: number;
  theme_name?: string | null;
  background_image?: string | null;
  plugins: Plugin[];
  type: "LightweightActivity";
  export_site?: string | null;
  pages: Page[];
  position?: number | null;
}

export interface Sequence {
  abstract: string | null;
  description: string | null;
  display_title: string | null;
  logo: string | null;
  project?: Project | null;
  theme_id: number | null;
  background_image?: string | null;
  thumbnail_url: string | null;
  title: string | null;
  activities: Activity[];
  type: string;
  export_site: string | null;
}

export interface IReportState {
  version?: number;
  mode: "report";
  authoredState: string;
  interactiveState: string;
}

/**
 * To match LARA we would normally also include a tool_user_id, but the activity player
 * keeps no user ids of its own.
 */
export interface ILTIPartial {
  platform_id: string;      // portal
  platform_user_id: string;
  context_id: string;       // class hash
  resource_link_id: string;  // offering ID
  resource_url: string;
  run_key: string;
  source_key: string;
  tool_id: string;
   // This is not an LTI property but it is required in our authenticated answers
  remote_endpoint: string;
}

export interface IAnonymousMetadataPartial {
  resource_url: string;
  run_key: string;
  source_key: string;
  tool_id: string;
  tool_user_id: "anonymous";
  platform_user_id: string;
}

/**
 * cf. IRunTimeMetadataBase, from
 * https://github.com/concord-consortium/lara/blob/master/lara-typescript/src/interactive-api-client/metadata-types.ts#L47
 * and partial export code at
 * https://github.com/concord-consortium/lara/blob/c40304a14ef495acdf4f9fd09ea892c7cc98247b/app/models/interactive_run_state.rb#L110
 */
export interface IExportableAnswerMetadataBase {
  question_id: string;    // converted from refId (e.g. "managed_interactive_404")
  question_type: string;
  id: string;             // randomly generated id (e.g. uuid)
  type: string;
  answer_text?: string;
  answer?: any;
  submitted: boolean | null;
  report_state: string;
  // tracks the most recently written details for each attachment
  attachments?: Record<string, IReadableAttachmentInfo>;
  // allows sharing answer with other students in the same class
  shared_with?: "context" | null;
}

export interface IExportableInteractiveAnswerMetadata extends IExportableAnswerMetadataBase {
  type: "interactive_state";
  answer: string;
}

export interface IExportableOpenResponseAnswerMetadata extends IExportableAnswerMetadataBase {
  type: "open_response_answer";
  answer: string;
}

export interface IExportableImageQuestionAnswerMetadata extends IExportableAnswerMetadataBase {
  type: "image_question_answer";
  answer: {
    text: string;
    image_url: string;
  }
}

export interface IExportableMultipleChoiceAnswerMetadata extends IExportableAnswerMetadataBase {
  type: "multiple_choice_answer";
  answer: {
    choice_ids: string[];
  }
}

export type IExportableAnswerMetadata =
  IExportableInteractiveAnswerMetadata |
  IExportableOpenResponseAnswerMetadata |
  IExportableMultipleChoiceAnswerMetadata |
  IExportableImageQuestionAnswerMetadata;

export interface LTIRuntimeAnswerMetadata extends ILTIPartial, IExportableAnswerMetadataBase { }

export interface AnonymousRuntimeAnswerMetadata extends IAnonymousMetadataPartial, IExportableAnswerMetadataBase { }

export interface IAuthenticatedLearnerPluginState extends ILTIPartial {
  pluginId: number;
  state: string;
}

export interface IAnonymousLearnerPluginState extends IAnonymousMetadataPartial {
  pluginId: number;
  state: string;
}
