import legacyResource from "../data/sample-activity-multiple-layout-types.json";
import { Page, SectionType, LibraryInteractive, Plugin, EmbeddableType } from "../types";
import { queryValue } from "../utilities/url-query";


interface legacyEmbeddableBase {
  type: string;
  name?: string;
  authored_state?: string | null;
  interactiveState?: any | null;
  url_fragment?: string | null,
  is_hidden: boolean;
  is_full_width?: boolean;
  ref_id: string;
  embeddable_ref_id?: string;
}

interface IManagedInteractive extends legacyEmbeddableBase {
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
  linked_interactive?: { ref_id: string };
}

 interface IMwInteractive extends legacyEmbeddableBase {
  type: "MwInteractive";
  base_url?: string;
  url?: string;
  native_height?: number;
  native_width?: number;
  enable_learner_state?: boolean;
  linked_interactives?: { ref_id: string, label: string }[];
  linked_interactive?: { ref_id: string };
}

 interface IEmbeddableXhtml extends legacyEmbeddableBase {
  type: "Embeddable::Xhtml";
  content?: string;
  is_callout?: boolean;
}

 interface IEmbeddablePlugin extends legacyEmbeddableBase {
  type: "Embeddable::EmbeddablePlugin";
  plugin?: Plugin;
}

type legacyEmbeddableType = IManagedInteractive | IMwInteractive | IEmbeddableXhtml | IEmbeddablePlugin;
interface legacyEmbeddableWrapper {
  section: "header_block" | "interactive_box" | null;
  embeddable: legacyEmbeddableType;
}

interface legacySection {}
interface legacyPageType {
  embeddable_display_mode: "stacked" | "carousel" | string;
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
  additional_sections: legacySection;        // update when we support additional sections
  embeddables: legacyEmbeddableWrapper[];
}

const getEmbeddablesArray = (embeddables: legacyEmbeddableType[], column: "primary" | "secondary" | null): EmbeddableType[] => {
  const embeddableArr:EmbeddableType[] = [];
  embeddables.forEach((legacyEmbeddable: legacyEmbeddableType) => {
    const isHalfWidth = !legacyEmbeddable.is_full_width;
    delete legacyEmbeddable.is_full_width;
    embeddableArr.push({column, is_half_width: isHalfWidth, ...legacyEmbeddable});
  });
  return embeddableArr;
};

const newSectionsResource = (resourcePage: legacyPageType): SectionType[] => { //have to use type any because of the change in type definition
  const pageLayout = resourcePage.layout;
  const sectionLayout = pageLayout === "l-full-width" ? "full-width" : pageLayout;
  const headerBlockEmbeddables: legacyEmbeddableType[] = [];
  const primaryBlockEmbeddables: legacyEmbeddableType[] = [];
  const secondaryBlockEmbeddables: legacyEmbeddableType[] = [];
  const newSections: SectionType[] = [];

  resourcePage.embeddables.forEach((embeddableWrapper: any) => {
    const section = embeddableWrapper.section;
    switch (section) {
      case "header_block":
        headerBlockEmbeddables.push(embeddableWrapper.embeddable);
        break;
      case "interactive_box":
        primaryBlockEmbeddables.push(embeddableWrapper.embeddable);
        break;
      case null:
        secondaryBlockEmbeddables.push(embeddableWrapper.embeddable);
        break;
    }
  });


  const headerBlockSection = {
    "layout": sectionLayout,
    "is_hidden": false,
    "secondary_column_collapsible": false,
    "secondary_column_display_mode": resourcePage.embeddable_display_mode,
    "embeddables": getEmbeddablesArray(headerBlockEmbeddables, null)
  };
  const primaryBlockSection = {
    "layout": sectionLayout,
    "is_hidden": false,
    "secondary_column_collapsible": false,
    "secondary_column_display_mode": resourcePage.embeddable_display_mode,
    "embeddables": getEmbeddablesArray(primaryBlockEmbeddables, "primary")
  };
  const secondaryBlockSection = {
    "layout": sectionLayout,
    "is_hidden": false,
    "secondary_column_collapsible": false,
    "secondary_column_display_mode": resourcePage.embeddable_display_mode,
    "embeddables": getEmbeddablesArray(secondaryBlockEmbeddables, "secondary")
  };
  headerBlockEmbeddables && newSections.push(headerBlockSection);
  primaryBlockEmbeddables && newSections.push(primaryBlockSection);
  secondaryBlockEmbeddables && newSections.push(secondaryBlockSection);

  return newSections;
};

const newPagesResource = (resourcePages: any):Page[] => {
  return (
    resourcePages.map((page: legacyPageType) => {
      return {
        "text": page.text,
        "id": page.id,
        "is_completion": page.is_completion,
        "is_hidden": page.is_hidden,
        "name": page.name,
        "position": page.position,
        "show_sidebar": page.show_sidebar,
        "sidebar": page.sidebar,
        "sidebar_title": page.sidebar_title,
        "sections": newSectionsResource(page)
      };
    })
  );
};

function convertResource () {

  const newActivityResource = {
    "background_image": legacyResource.background_image,
    "description": legacyResource.description,
    "editor_mode": legacyResource.editor_mode,
    // id: ??,
    "layout": legacyResource.layout,
    "name": legacyResource.name,
    "notes": legacyResource.notes,
    "related": legacyResource.related,
    "show_submit_button": legacyResource.show_submit_button,
    "student_report_enabled": legacyResource.student_report_enabled,
    "thumbnail_url": legacyResource.thumbnail_url,
    "time_to_complete": legacyResource.time_to_complete,
    "version": 2,
    "theme_name": legacyResource.theme_name,
    "project": legacyResource.project,
    "plugins": legacyResource.plugins,
    "type": "LightweightActivity",
    "export_site": legacyResource.export_site,
    "pages": newPagesResource(legacyResource.pages)
  };
  return newActivityResource;
}

// const resourceToConvert = queryValue("activity");
// const resourceToConvert = "sample-activity-multiple-layout-types";
// const localPath = "../data/";
// const resourcePath = localPath + resourceToConvert + ".json";
// const legacyResource = import(resourcePath);
const r = convertResource();
console.log(JSON.stringify(r));

// function download(filename: string, text: any) {
//   const element = document.createElement("a");
//   element.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(text));
//   element.setAttribute("download", filename);

//   element.style.display = "none";
//   document.body.appendChild(element);

//   element.click();

//   document.body.removeChild(element);
// }

// // Start file download.
// download("../data/converted-multiple-layouts.json", JSON.stringify(r));
