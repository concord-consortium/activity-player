import { EmbeddableType, SectionType } from "../types";
import { ActivityLayouts } from "./activity-utils";

const kSplitLayouts = ["60-40", "40-60", "70-30", "30-70", "responsive-30-70", "responsive-2-column", "responsive-50-50"];
// The other split layouts put the secondary column on the left.
const kPrimaryLeftLayouts = ["60-40", "70-30"];

export interface ISectionColumns {
  /** The section renders as one column: a full-width layout, or a single-page activity. */
  stacked: boolean;
  /** The section's layout is single-column, not merely stacked by the activity layout. */
  singleColumn: boolean;
  /** Visible embeddables of the left and right columns; empty when stacked. */
  left: EmbeddableType[];
  right: EmbeddableType[];
  leftIsPrimary: boolean;
}

export const getSectionColumns = (section: SectionType, activityLayout: number): ISectionColumns => {
  const { layout, embeddables } = section;
  const hasColumns = kSplitLayouts.includes(layout) || layout === "responsive";
  const primary = hasColumns ? embeddables.filter(e => e.column === "primary" && !e.is_hidden) : [];
  const secondary = hasColumns ? embeddables.filter(e => e.column === "secondary" && !e.is_hidden) : [];
  const singleColumn = layout === "full-width" || layout === "responsive-full-width";
  const stacked = singleColumn || activityLayout === ActivityLayouts.SinglePage;
  const leftIsPrimary = kPrimaryLeftLayouts.includes(layout);
  return {
    stacked,
    singleColumn,
    left: stacked ? [] : leftIsPrimary ? primary : secondary,
    right: stacked ? [] : leftIsPrimary ? secondary : primary,
    leftIsPrimary
  };
};
