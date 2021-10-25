import laraResource from "../data/sample-activity-2-copy.json"; //1. Read JSON
import { Activity, Page, SectionType } from "../types";
/*
1. Read JSON
2. Create a new JSON to be filled in with relevant values from old JSON
2. Find "version" key and set value to 2
3. For each page:
    a. get the value of embeddable_display_mode
    b. get the value of layout
    c. get the value of embeddables
      1. for each embeddable:
        a. get the value of section -> this will dictate the number of sections when creating the sections array
3. Change "is_full_width" to "is_half_width", and assign !currentValue of "is_full_width"
5. To each section: add:
    a. layout, and get value from layout on pages level
    b. secondary_column_display_mode, and get value from embedabble_display_mode
    c. is_hidden, assume value is false
    d. embeddables, value is array of each embeddable in the pages.embeddables
6. For each embeddable in section.embeddables:
    a. Add column key with value of null (if layout is full-width),
*/

const newSectionsResource = (resourcePage: any) => { //have to use type any because of the change in type definition
  const pageLayout = resourcePage.layout;
  const headerBlockEmbeddables: any = [];
  const primaryBlockEmbeddables: any = [];
  const secondaryBlockEmbeddables: any = [];
  let column: string | null = "";
  let newSections: any = [];
  let newSection: any = {};

  resourcePage.embeddables.forEach((embeddable: any) => {
    const section = embeddable.section;
    switch (section) {
      case "header-block":
        headerBlockEmbeddables.push(embeddable);
        column = null;
        break;
      case "interactive_box":
        primaryBlockEmbeddables.push(embeddable);
        column = "primary";
        break;
      case null:
        secondaryBlockEmbeddables.push(embeddable);
        column = "secondary";
        break;
    }
  });

  if (pageLayout === "l-full-width") {
    newSection = {
      layout: "full-width",
      is_hidden: false,
      secondary_column_collapsible: false,
      secondary_column_display_mode: "stacked",
      embeddables: [
        {
          column: null,
          embeddable: resourcePage.embedabble
        }
      ]
    };
  }
  if (pageLayout !== "l-full-width") {
    newSection = {
      layout: pageLayout,
      is_hidden: false,
      secondary_column_collapsible: resourcePage.is_hidden,
      secondary_column_display_mode: "stacked",
      embeddables: [
        {
          column,
          embeddable: resourcePage.embedabble
        }
      ]
    };
  }

  const headerBlockSection = {
    layout: "full-width",
    is_hidden: false,
    secondary_column_collapsible: false,
    secondary_column_display_mode: resourcePage.embedabble_display_mode,
    embeddables: [
      {
        embeddable: headerBlockEmbeddables
      }
    ]
  };
  const primaryBlockSection = {
    layout: pageLayout,
    is_hidden: false,
    secondary_column_collapsible: false,
    secondary_column_display_mode: resourcePage.embedabble_display_mode,
    embeddables: [
      {
        embeddable: primaryBlockEmbeddables
      }
    ]
  };
  const secondaryBlockSection = {
    layout: pageLayout,
    is_hidden: false,
    secondary_column_collapsible: false,
    secondary_column_display_mode: resourcePage.embedabble_display_mode,
    embeddables: [
      {
        embeddable: secondaryBlockEmbeddables
      }
    ]
  };

  newSections = [
    headerBlockSection,
    primaryBlockSection,
    secondaryBlockSection,
  ];
};

const newPagesResource = (resourcePages: any) => {
  resourcePages.map((page: any) => {
    const newPage = {
      is_completion: page.is_completion,
      is_hidden: page.is_hidden,
      name: page.name,
      position: page.position,
      show_sidebar: page.show_sidebar,
      sidebar: page.sidebar,
      sidebar_title: page.sidebar_title,
      sections: newSectionsResource(page)
    };
  });
};

const newPagesObj = newPagesResource(laraResource.pages);

const newActivityResourceObj: any = {
  background_image: laraResource.background_image,
  description: laraResource.description,
  editor_mode: laraResource.editor_mode,
  // id: ??,
  layout: laraResource.layout,
  name: laraResource.name,
  notes: laraResource.notes,
  related: laraResource.related,
  runtime: "Activity Player",
  show_submit_button: laraResource.show_submit_button,
  student_report_enabled: laraResource.student_report_enabled,
  thumbnail_url: laraResource.thumbnail_url,
  time_to_complete: laraResource.time_to_complete,
  version: 2,
  theme_name: laraResource.theme_name,
  project: laraResource.project,
  plugins: laraResource.plugins,
  type: "LightweightActivity",
  export_site: laraResource.export_site,
  pages: newPagesObj,
  // [
  //   {
  //     is_completion: false,
  //     is_hidden: false,
  //     name: "Full Width with header block, MC, OR, and interactive",
  //     position: 1,
  //     show_sidebar: false,
  //     sidebar: null,
  //     sidebar_title: "Did you know?",
  //     sections: [
  //       {
  //         layout: "full-width",
  //         is_hidden: false,
  //         secondary_column_collapsible: false,
  //         secondary_column_display_mode: "stacked",
  //         embeddables: [
  //           {

  //           }
  //         ]
  //       }
  //     ]
  //   }
  // ],
};
