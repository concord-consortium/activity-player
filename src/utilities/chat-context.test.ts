import { Activity, Page } from "../types";
import { assemblePageContext, renderPageContext } from "./chat-context";
import { getVisiblePages } from "./page-walk";
import _activity from "../data/version-2/sample-new-sections-activity-1.json";

const activity = _activity as unknown as Activity;

// A small synthetic activity to exercise hidden-content exclusion, image classification, and
// authored ordering without over-fitting to sample-data specifics.
const syntheticActivity = {
  id: 42,
  name: "Synthetic Activity",
  layout: 0,
  pages: [
    { id: 100, is_hidden: false, is_completion: false, name: "Intro-ish", sections: [] },
    {
      id: 200,
      is_hidden: false,
      is_completion: false,
      name: "Content Page",
      sections: [
        {
          is_hidden: false,
          embeddables: [
            { type: "Embeddable::Xhtml", is_hidden: false, content: "<p>Hello text</p>" },
            { type: "Embeddable::Xhtml", is_hidden: true, content: "<p>hidden text</p>" },
            { type: "MwInteractive", is_hidden: false, name: "A Diagram", url: "https://example.org/pic.png" },
          ],
        },
        { is_hidden: true, embeddables: [{ type: "Embeddable::Xhtml", is_hidden: false, content: "in hidden section" }] },
      ],
    },
    { id: 300, is_hidden: true, is_completion: false, name: "Hidden Page", sections: [] },
  ],
} as unknown as Activity;

describe("chat-context assembler", () => {
  it("computes orientation with page N of M over visible pages", () => {
    const visible = getVisiblePages(activity);
    const page = visible[1];
    const ctx = assemblePageContext(activity, page, {
      sequenceTitle: "My Sequence",
      activityTitle: "My Activity",
      activityIndex: 1,
      activityCount: 4,
    });
    expect(ctx.orientation.pageNumber).toBe(2);
    expect(ctx.orientation.pageCount).toBe(visible.length);
    expect(ctx.orientation.sequenceTitle).toBe("My Sequence");
    expect(ctx.orientation.activityIndex).toBe(1);
    expect(ctx.orientation.activityCount).toBe(4);
    expect(ctx.orientation.activityTitle).toBe("My Activity");
  });

  it("falls back to activity.name for the title and omits sequence/activity lines when standalone", () => {
    const page = getVisiblePages(activity)[1];
    const ctx = assemblePageContext(activity, page);
    expect(ctx.orientation.activityTitle).toBe(activity.name);
    expect(ctx.orientation.sequenceTitle).toBeNull();
    expect(ctx.orientation.activityIndex).toBeUndefined();
    const text = renderPageContext(ctx);
    expect(text).not.toContain("Sequence:");
    expect(text).not.toContain("Activity ");
    expect(text).toContain("Page 2 of");
  });

  it("emits body items in authored order, keeping question authored_state and text content", () => {
    const page = getVisiblePages(activity)[1];
    const ctx = assemblePageContext(activity, page);
    // page[1] of the sample has a text (Xhtml) then a question (ManagedInteractive)
    expect(ctx.body.length).toBeGreaterThanOrEqual(2);
    const kinds = ctx.body.map(b => b.kind);
    expect(kinds).toContain("text");
    expect(kinds).toContain("question");
    const question = ctx.body.find(b => b.kind === "question");
    expect(typeof (question as any).authoredState).toBe("string");
  });

  it("excludes hidden pages, sections, and embeddables and classifies images by URL", () => {
    const page = (syntheticActivity.pages as Page[])[1];
    const ctx = assemblePageContext(syntheticActivity, page, {});
    // visible pages = ids 100 and 200 → page 200 is page 2 of 2
    expect(ctx.orientation.pageCount).toBe(2);
    expect(ctx.orientation.pageNumber).toBe(2);
    // body: one visible text + one image; hidden text + hidden-section text excluded
    expect(ctx.body).toEqual([
      { kind: "text", content: "<p>Hello text</p>" },
      { kind: "image", name: "A Diagram" },
    ]);
  });

  it("renders the orientation block and body as plain text", () => {
    const page = getVisiblePages(activity)[1];
    const ctx = assemblePageContext(activity, page, {
      sequenceTitle: "Seq",
      activityTitle: "Act",
      activityIndex: 0,
      activityCount: 3,
    });
    const text = renderPageContext(ctx);
    expect(text).toContain('Sequence: "Seq"');
    expect(text).toContain('Activity 1 of 3: "Act"');
    expect(text).toContain("Page 2 of");
    expect(text).toContain("authored_state:");
  });

  it("renders a placeholder when the page has no visible content", () => {
    const emptyPage = (syntheticActivity.pages as Page[])[0]; // id 100, no sections
    const ctx = assemblePageContext(syntheticActivity, emptyPage, {});
    const text = renderPageContext(ctx);
    expect(text).toContain("no authored text, images, or questions");
  });
});
