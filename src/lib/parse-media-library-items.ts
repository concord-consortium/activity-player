import { IMediaLibrary, IMediaLibraryItem, IMediaLibraryItemType } from "@concord-consortium/lara-interactive-api";
import { Activity, Sequence } from "../types";

// This is created in question interactives helpers but can't by imported right now as the React versions
// are different by a major version and it will not install given the React peer dependencies are different.
// Once AP is upgraded to React 17 this can be imported for better type checking.
export interface IAuthoredStateWithExportedMediaLibrary {
  exportToMediaLibrary: boolean;
  exportToMediaLibraryType: IMediaLibraryItemType;
  exportToMediaLibraryUrlField: string;
  exportToMediaLibraryCaptionField?: string;
}

export const parseMediaLibraryItemsInActivity = (activity: Activity) => {
  const items: IMediaLibraryItem[] = [];

  activity.pages.forEach(page => {
    page.sections.forEach(section => {
      section.embeddables.forEach(embeddable => {
        try {
          const authoredState: IAuthoredStateWithExportedMediaLibrary = JSON.parse(embeddable.authored_state || "{}");
          const {exportToMediaLibrary, exportToMediaLibraryType, exportToMediaLibraryUrlField, exportToMediaLibraryCaptionField} = authoredState;
          const url = ((exportToMediaLibraryUrlField && (authoredState as any)[exportToMediaLibraryUrlField]) || "").trim();
          const caption = ((exportToMediaLibraryCaptionField && (authoredState as any)[exportToMediaLibraryCaptionField]) || embeddable.name || exportToMediaLibraryType).trim();

          if (exportToMediaLibrary && exportToMediaLibraryType && url) {
            items.push({url, type: exportToMediaLibraryType, caption});
          }
        } catch (e) {
          // noop - we don't care if there is bad authored state when looking for the media items
        }
      });
    });
  });

  return items;
};

export const parseMediaLibraryItems = ({sequence, activity}: {sequence?: Sequence, activity: Activity}): IMediaLibrary => {
  let items: IMediaLibraryItem[];

  if (sequence) {
    items = sequence.activities.reduce<IMediaLibraryItem[]>((acc, cur) => {
      acc.concat(parseMediaLibraryItemsInActivity(cur));
      return acc;
    }, []);
  } else {
    items = parseMediaLibraryItemsInActivity(activity);
  }

  // remove duplicate urls
  const duplicateMap: Record<string,boolean> = {};
  items = items.filter(item => {
    const isDuplicate = !!duplicateMap[item.url];
    duplicateMap[item.url] = true;
    return !isDuplicate;
  });

  return {
    enabled: items.length > 0,
    items
  };
};
