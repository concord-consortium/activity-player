import { flattenActivityToSlides, isQuestionType, getPageBoundaryIndex, FlattenedSlide } from "./single-question-utils";
import { Activity } from "../types";
import { DefaultTestActivity, DefaultTestPage, DefaultTestSection, DefaultTestEmbeddable, DefaultManagedInteractive, DefaultXhtmlComponent } from "../test-utils/model-for-tests";

describe("single-question-utils", () => {
  describe("isQuestionType", () => {
    it("returns true for ManagedInteractive", () => {
      expect(isQuestionType({ ...DefaultManagedInteractive })).toBe(true);
    });

    it("returns true for MwInteractive", () => {
      expect(isQuestionType({ ...DefaultTestEmbeddable, type: "MwInteractive" })).toBe(true);
    });

    it("returns false for Embeddable::Xhtml", () => {
      expect(isQuestionType({ ...DefaultXhtmlComponent })).toBe(false);
    });

    it("returns false for other types", () => {
      expect(isQuestionType({ ...DefaultTestEmbeddable, type: "Embeddable::EmbeddablePlugin" } as any)).toBe(false);
    });
  });

  describe("flattenActivityToSlides", () => {
    it("returns introduction and completion slides for empty activity", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: []
      };
      const slides = flattenActivityToSlides(activity);

      expect(slides).toHaveLength(2);
      expect(slides[0].type).toBe("introduction");
      expect(slides[0].globalIndex).toBe(0);
      expect(slides[0].activityName).toBe(activity.name);
      expect(slides[1].type).toBe("completion");
      expect(slides[1].globalIndex).toBe(1);
    });

    it("includes activity metadata in introduction slide", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        name: "Test Activity",
        description: "A test description",
        thumbnail_url: "http://example.com/thumb.png",
        time_to_complete: 30,
        pages: []
      };
      const slides = flattenActivityToSlides(activity);

      expect(slides[0].activityName).toBe("Test Activity");
      expect(slides[0].activityDescription).toBe("A test description");
      expect(slides[0].activityThumbnail).toBe("http://example.com/thumb.png");
      expect(slides[0].estimatedTime).toBe(30);
    });

    it("creates page-header slide for each visible page", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [
          { ...DefaultTestPage, id: 1, name: "Page 1", sections: [] },
          { ...DefaultTestPage, id: 2, name: "Page 2", sections: [] }
        ]
      };
      const slides = flattenActivityToSlides(activity);

      // intro + 2 page headers + completion
      expect(slides).toHaveLength(4);
      expect(slides[1].type).toBe("page-header");
      expect(slides[1].pageName).toBe("Page 1");
      expect(slides[1].pageId).toBe(1);
      expect(slides[2].type).toBe("page-header");
      expect(slides[2].pageName).toBe("Page 2");
      expect(slides[2].pageId).toBe(2);
    });

    it("skips hidden pages", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [
          { ...DefaultTestPage, id: 1, name: "Visible Page", sections: [] },
          { ...DefaultTestPage, id: 2, name: "Hidden Page", is_hidden: true, sections: [] }
        ]
      };
      const slides = flattenActivityToSlides(activity);

      // intro + 1 page header + completion
      expect(slides).toHaveLength(3);
      expect(slides[1].pageName).toBe("Visible Page");
    });

    it("skips completion pages", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [
          { ...DefaultTestPage, id: 1, name: "Regular Page", sections: [] },
          { ...DefaultTestPage, id: 2, name: "Completion Page", is_completion: true, sections: [] }
        ]
      };
      const slides = flattenActivityToSlides(activity);

      // intro + 1 page header + completion (our generated one, not the page)
      expect(slides).toHaveLength(3);
      expect(slides[1].pageName).toBe("Regular Page");
    });

    it("creates section-header slides only for named sections", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [{
          ...DefaultTestPage,
          id: 1,
          name: "Page 1",
          sections: [
            { ...DefaultTestSection, name: "Named Section", embeddables: [] },
            { ...DefaultTestSection, name: "", embeddables: [] },
            { ...DefaultTestSection, name: null as any, embeddables: [] }
          ]
        }]
      };
      const slides = flattenActivityToSlides(activity);

      // intro + page-header + 1 section-header + completion
      expect(slides).toHaveLength(4);
      expect(slides[2].type).toBe("section-header");
      expect(slides[2].sectionName).toBe("Named Section");
    });

    it("skips hidden sections", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [{
          ...DefaultTestPage,
          id: 1,
          sections: [
            { ...DefaultTestSection, name: "Visible", is_hidden: false, embeddables: [] },
            { ...DefaultTestSection, name: "Hidden", is_hidden: true, embeddables: [] }
          ]
        }]
      };
      const slides = flattenActivityToSlides(activity);

      const sectionHeaders = slides.filter(s => s.type === "section-header");
      expect(sectionHeaders).toHaveLength(1);
      expect(sectionHeaders[0].sectionName).toBe("Visible");
    });

    it("creates embeddable slides with question numbering for interactive types", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [{
          ...DefaultTestPage,
          id: 1,
          sections: [{
            ...DefaultTestSection,
            embeddables: [
              { ...DefaultManagedInteractive, ref_id: "q1" },
              { ...DefaultXhtmlComponent, ref_id: "text1" },
              { ...DefaultManagedInteractive, ref_id: "q2" }
            ]
          }]
        }]
      };
      const slides = flattenActivityToSlides(activity);

      const embeddableSlides = slides.filter(s => s.type === "embeddable");
      expect(embeddableSlides).toHaveLength(3);
      expect(embeddableSlides[0].questionNumber).toBe(1);
      expect(embeddableSlides[1].questionNumber).toBeNull();
      expect(embeddableSlides[2].questionNumber).toBe(2);
    });

    it("skips hidden embeddables", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [{
          ...DefaultTestPage,
          id: 1,
          sections: [{
            ...DefaultTestSection,
            embeddables: [
              { ...DefaultManagedInteractive, ref_id: "visible", is_hidden: false },
              { ...DefaultManagedInteractive, ref_id: "hidden", is_hidden: true }
            ]
          }]
        }]
      };
      const slides = flattenActivityToSlides(activity);

      const embeddableSlides = slides.filter(s => s.type === "embeddable");
      expect(embeddableSlides).toHaveLength(1);
      expect(embeddableSlides[0].embeddable?.ref_id).toBe("visible");
    });

    it("assigns correct globalIndex to all slides", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [{
          ...DefaultTestPage,
          id: 1,
          name: "Page 1",
          sections: [{
            ...DefaultTestSection,
            name: "Section 1",
            embeddables: [
              { ...DefaultManagedInteractive, ref_id: "q1" }
            ]
          }]
        }]
      };
      const slides = flattenActivityToSlides(activity);

      // intro(0) + page-header(1) + section-header(2) + embeddable(3) + completion(4)
      expect(slides).toHaveLength(5);
      slides.forEach((slide, index) => {
        expect(slide.globalIndex).toBe(index);
      });
    });

    it("marks page-header slides for skipInNavigation when no content", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [
          { ...DefaultTestPage, id: 1, name: "Has Name", text: "", sections: [] },
          { ...DefaultTestPage, id: 2, name: "", text: "Has Text", sections: [] },
          { ...DefaultTestPage, id: 3, name: "", text: "", sections: [] }
        ]
      };
      const slides = flattenActivityToSlides(activity);

      const pageHeaders = slides.filter(s => s.type === "page-header");
      expect(pageHeaders[0].skipInNavigation).toBe(false); // has name
      expect(pageHeaders[1].skipInNavigation).toBe(false); // has text
      expect(pageHeaders[2].skipInNavigation).toBe(true);  // no content
    });

    it("includes sourcePageIndex and sourcePageId on all page-related slides", () => {
      const activity: Activity = {
        ...DefaultTestActivity,
        pages: [{
          ...DefaultTestPage,
          id: 42,
          name: "Test Page",
          sections: [{
            ...DefaultTestSection,
            name: "Test Section",
            embeddables: [{ ...DefaultManagedInteractive, ref_id: "q1" }]
          }]
        }]
      };
      const slides = flattenActivityToSlides(activity);

      const pageHeader = slides.find(s => s.type === "page-header");
      const sectionHeader = slides.find(s => s.type === "section-header");
      const embeddable = slides.find(s => s.type === "embeddable");

      expect(pageHeader?.sourcePageIndex).toBe(0);
      expect(pageHeader?.sourcePageId).toBe(42);
      expect(sectionHeader?.sourcePageIndex).toBe(0);
      expect(sectionHeader?.sourcePageId).toBe(42);
      expect(embeddable?.sourcePageIndex).toBe(0);
      expect(embeddable?.sourcePageId).toBe(42);
    });
  });

  describe("getPageBoundaryIndex", () => {
    const createSlides = (): FlattenedSlide[] => [
      { type: "introduction", globalIndex: 0 },
      { type: "page-header", globalIndex: 1, sourcePageId: 1 },
      { type: "embeddable", globalIndex: 2, sourcePageId: 1 },
      { type: "embeddable", globalIndex: 3, sourcePageId: 1 },
      { type: "page-header", globalIndex: 4, sourcePageId: 2 },
      { type: "embeddable", globalIndex: 5, sourcePageId: 2 },
      { type: "completion", globalIndex: 6 }
    ];

    it("returns 0 for empty slides array", () => {
      expect(getPageBoundaryIndex(0, [], "next")).toBe(0);
      expect(getPageBoundaryIndex(0, [], "prev")).toBe(0);
    });

    describe("from introduction slide", () => {
      it("goes to first page-header on next", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(0, slides, "next")).toBe(1);
      });

      it("stays at 0 on prev", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(0, slides, "prev")).toBe(0);
      });
    });

    describe("from completion slide", () => {
      it("stays at end on next", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(6, slides, "next")).toBe(6);
      });

      it("goes to last page-header on prev", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(6, slides, "prev")).toBe(4);
      });
    });

    describe("from embeddable on page 1", () => {
      it("goes to next page-header on next", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(2, slides, "next")).toBe(4);
        expect(getPageBoundaryIndex(3, slides, "next")).toBe(4);
      });

      it("goes to current page-header on prev when not at page start", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(2, slides, "prev")).toBe(1);
        expect(getPageBoundaryIndex(3, slides, "prev")).toBe(1);
      });
    });

    describe("from page-header", () => {
      it("goes to next page-header or completion on next", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(1, slides, "next")).toBe(4);
        expect(getPageBoundaryIndex(4, slides, "next")).toBe(6); // completion
      });

      it("goes to introduction or previous page-header on prev", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(1, slides, "prev")).toBe(0); // introduction
        expect(getPageBoundaryIndex(4, slides, "prev")).toBe(1); // previous page-header
      });
    });

    describe("from embeddable on last page", () => {
      it("goes to completion on next", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(5, slides, "next")).toBe(6);
      });

      it("goes to page-header on prev", () => {
        const slides = createSlides();
        expect(getPageBoundaryIndex(5, slides, "prev")).toBe(4);
      });
    });
  });
});
