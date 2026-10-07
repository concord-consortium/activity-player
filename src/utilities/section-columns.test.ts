import { EmbeddableType, SectionType } from "../types";
import { DefaultTestSection, DefaultXhtmlComponent } from "../test-utils/model-for-tests";
import { ActivityLayouts } from "./activity-utils";
import { getSectionColumns } from "./section-columns";

const embeddable = (refId: string, column: "primary" | "secondary", isHidden = false): EmbeddableType =>
  ({ ...DefaultXhtmlComponent, ref_id: refId, column, is_hidden: isHidden });

const p1 = embeddable("p1", "primary");
const s1 = embeddable("s1", "secondary");
const p2 = embeddable("p2", "primary");
const s2 = embeddable("s2", "secondary");

const section = (layout: string, embeddables: EmbeddableType[] = [p1, s1, p2, s2]): SectionType =>
  ({ ...DefaultTestSection, layout, embeddables });

const refIds = (embeddables: EmbeddableType[]) => embeddables.map(e => e.ref_id);

describe("getSectionColumns", () => {
  it.each(["60-40", "70-30"])("puts the primary column on the left in %s", layout => {
    const columns = getSectionColumns(section(layout), ActivityLayouts.MultiplePages);
    expect(columns.stacked).toBe(false);
    expect(columns.leftIsPrimary).toBe(true);
    expect(refIds(columns.left)).toEqual(["p1", "p2"]);
    expect(refIds(columns.right)).toEqual(["s1", "s2"]);
  });

  it.each(["40-60", "30-70", "responsive-30-70", "responsive-2-column", "responsive-50-50", "responsive"])(
    "puts the secondary column on the left in %s", layout => {
      const columns = getSectionColumns(section(layout), ActivityLayouts.MultiplePages);
      expect(columns.stacked).toBe(false);
      expect(columns.leftIsPrimary).toBe(false);
      expect(refIds(columns.left)).toEqual(["s1", "s2"]);
      expect(refIds(columns.right)).toEqual(["p1", "p2"]);
    }
  );

  it.each(["full-width", "responsive-full-width"])("stacks %s as a single column", layout => {
    const columns = getSectionColumns(section(layout), ActivityLayouts.MultiplePages);
    expect(columns.stacked).toBe(true);
    expect(columns.singleColumn).toBe(true);
    expect(columns.left).toEqual([]);
    expect(columns.right).toEqual([]);
  });

  it("stacks a split layout in a single-page activity without making it single-column", () => {
    const columns = getSectionColumns(section("60-40"), ActivityLayouts.SinglePage);
    expect(columns.stacked).toBe(true);
    expect(columns.singleColumn).toBe(false);
  });

  it("leaves hidden embeddables out of the columns", () => {
    const hidden = embeddable("hidden", "primary", true);
    const columns = getSectionColumns(section("60-40", [p1, hidden, s1]), ActivityLayouts.MultiplePages);
    expect(refIds(columns.left)).toEqual(["p1"]);
    expect(refIds(columns.right)).toEqual(["s1"]);
  });
});
