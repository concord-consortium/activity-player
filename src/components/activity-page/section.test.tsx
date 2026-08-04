import React from "react";
import { getPinnedColumn, Section } from "./section";
import { configure, fireEvent, render } from "@testing-library/react";
import { DefaultTestPage, DefaultTestSection, DefaultXhtmlComponent } from "../../test-utils/model-for-tests";
import { IEmbeddableXhtml } from "../../types";

describe("Section component", () => {
  const stubFunction = () => {
    // do nothing.
  };

  beforeEach(() => {
    configure({ testIdAttribute: "data-cy" });
  });

  it("renders section component", () => {
    const page = {...DefaultTestPage};
    const section = { ...DefaultTestSection, layout: "l-responsive" };
    const { getByTestId } = render(<Section
      section={section}
      activityLayout={0}
      questionNumberStart={5}
      setNavigation={stubFunction}
      pluginsLoaded={true}
      page={page}
    />);
    expect(getByTestId("section-split-layout")).toBeDefined();
    expect(getByTestId("section-column-primary")).toBeDefined();
    expect(getByTestId("section-column-secondary")).toBeDefined();
  });

  describe("responsive-50-50 layout", () => {
    const createXhtmlEmbeddable = (refId: string, column: "primary" | "secondary"): IEmbeddableXhtml => ({
      ...DefaultXhtmlComponent,
      column,
      ref_id: refId
    });

    it("renders split layout with primary and secondary columns", () => {
      const page = {...DefaultTestPage};
      const primaryEmbeddable = createXhtmlEmbeddable("primary-1", "primary");
      const secondaryEmbeddable = createXhtmlEmbeddable("secondary-1", "secondary");
      const section = {
        ...DefaultTestSection,
        embeddables: [primaryEmbeddable, secondaryEmbeddable],
        layout: "responsive-50-50"
      };

      const { getByTestId } = render(<Section
        activityLayout={0}
        page={page}
        pluginsLoaded={true}
        questionNumberStart={1}
        section={section}
        setNavigation={stubFunction}
      />);

      expect(getByTestId("section-split-layout")).toBeDefined();
      expect(getByTestId("section-column-primary")).toBeDefined();
      expect(getByTestId("section-column-secondary")).toBeDefined();
    });

    it("applies responsive-50-50 class to columns", () => {
      const page = {...DefaultTestPage};
      const primaryEmbeddable = createXhtmlEmbeddable("primary-1", "primary");
      const secondaryEmbeddable = createXhtmlEmbeddable("secondary-1", "secondary");
      const section = {
        ...DefaultTestSection,
        embeddables: [primaryEmbeddable, secondaryEmbeddable],
        layout: "responsive-50-50"
      };

      const { getByTestId } = render(<Section
        activityLayout={0}
        section={section}
        page={page}
        pluginsLoaded={true}
        questionNumberStart={1}
        setNavigation={stubFunction}
      />);

      const primaryColumn = getByTestId("section-column-primary");
      const secondaryColumn = getByTestId("section-column-secondary");

      expect(primaryColumn.classList.contains("responsive-50-50")).toBe(true);
      expect(secondaryColumn.classList.contains("responsive-50-50")).toBe(true);
    });

    it("applies responsive class to section for responsive-50-50 layout", () => {
      const page = {...DefaultTestPage};
      const primaryEmbeddable = createXhtmlEmbeddable("primary-1", "primary");
      const section = {
        ...DefaultTestSection,
        embeddables: [primaryEmbeddable],
        layout: "responsive-50-50"
      };

      const { getByTestId } = render(<Section
        section={section}
        activityLayout={0}
        questionNumberStart={1}
        setNavigation={stubFunction}
        pluginsLoaded={true}
        page={page}
      />);

      const sectionElement = getByTestId("section-split-layout");
      expect(sectionElement.classList.contains("responsive")).toBe(true);
    });

    it("has collapsible column on left for responsive-50-50", () => {
      const page = {...DefaultTestPage};
      const primaryEmbeddable = createXhtmlEmbeddable("primary-1", "primary");
      const secondaryEmbeddable = createXhtmlEmbeddable("secondary-1", "secondary");
      const section = {
        ...DefaultTestSection,
        embeddables: [primaryEmbeddable, secondaryEmbeddable],
        layout: "responsive-50-50",
        secondary_column_collapsible: true
      };

      const { getByTestId } = render(<Section
        activityLayout={0}
        section={section}
        page={page}
        pluginsLoaded={true}
        questionNumberStart={1}
        setNavigation={stubFunction}
      />);

      const collapsibleHeader = getByTestId("collapsible-header");
      expect(collapsibleHeader.classList.contains("left")).toBe(true);
    });
  });

  describe("collapsible secondary column accessibility (AP-95)", () => {
    const createXhtmlEmbeddable = (refId: string, column: "primary" | "secondary"): IEmbeddableXhtml => ({
      ...DefaultXhtmlComponent,
      column,
      ref_id: refId
    });

    const renderCollapsibleSection = () => {
      const page = {...DefaultTestPage};
      const section = {
        ...DefaultTestSection,
        embeddables: [
          createXhtmlEmbeddable("primary-1", "primary"),
          createXhtmlEmbeddable("secondary-1", "secondary")
        ],
        layout: "responsive-50-50",
        secondary_column_collapsible: true
      };
      return render(<Section
        activityLayout={0}
        section={section}
        page={page}
        pluginsLoaded={true}
        questionNumberStart={1}
        setNavigation={stubFunction}
      />);
    };

    it("renders the collapsible trigger as a native button", () => {
      const { getByTestId } = renderCollapsibleSection();
      const trigger = getByTestId("collapsible-header");
      expect(trigger.tagName).toBe("BUTTON");
    });

    it("exposes an accessible name on the trigger", () => {
      const { getByTestId } = renderCollapsibleSection();
      const trigger = getByTestId("collapsible-header");
      // accessible name must contain the visible word ("Hide") for WCAG Label in Name
      expect(trigger.getAttribute("aria-label")).toMatch(/hide/i);
    });

    it("reflects the expanded state and toggles aria-expanded on activation", () => {
      const { getByTestId } = renderCollapsibleSection();
      const trigger = getByTestId("collapsible-header");
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
      fireEvent.click(trigger);
      expect(getByTestId("collapsible-header").getAttribute("aria-expanded")).toBe("false");
      fireEvent.click(getByTestId("collapsible-header"));
      expect(getByTestId("collapsible-header").getAttribute("aria-expanded")).toBe("true");
    });

    it("references the controlled panel via aria-controls", () => {
      const { getByTestId, container } = renderCollapsibleSection();
      const trigger = getByTestId("collapsible-header");
      const panelId = trigger.getAttribute("aria-controls");
      expect(panelId).toBeTruthy();
      expect(container.querySelector(`#${panelId}`)).not.toBeNull();
    });
  });

  describe("getPinnedColumn (AP-129)", () => {
    const screenHeight = 900;
    const pinnedColumn = (primaryHeight?: number, secondaryHeight?: number, secondaryPinnable = true) =>
      getPinnedColumn({ primaryHeight, secondaryHeight, screenHeight, secondaryPinnable });

    it("pins nothing until the primary column has been measured", () => {
      expect(pinnedColumn(undefined, undefined)).toBeUndefined();
      // the secondary column cannot be pinned on its own: the decision needs both heights
      expect(pinnedColumn(undefined, 300)).toBeUndefined();
    });

    it("pins the primary column without waiting for the secondary column to be measured", () => {
      expect(pinnedColumn(500, undefined)).toBe("primary");
      // but a primary column that cannot be pinned leaves nothing pinned until the
      // secondary column has been measured too
      expect(pinnedColumn(3000, undefined)).toBeUndefined();
    });

    it("pins the primary column when it fits in the window", () => {
      expect(pinnedColumn(500, 2000)).toBe("primary");
      // it keeps the primary column pinned even when the secondary column is shorter
      expect(pinnedColumn(500, 100)).toBe("primary");
    });

    it("pins the secondary column when the primary column is too tall and the secondary fits", () => {
      expect(pinnedColumn(3000, 400)).toBe("secondary");
    });

    it("pins nothing when both columns are taller than the window", () => {
      expect(pinnedColumn(3000, 1200)).toBeUndefined();
    });

    it("pins nothing when the secondary column is not shorter than the primary, or is unpinnable", () => {
      // a secondary column no shorter than the primary has nothing to stay in view for
      expect(pinnedColumn(1000, 1000)).toBeUndefined();
      // empty or collapsed secondary columns have nothing worth pinning
      expect(pinnedColumn(3000, 400, false)).toBeUndefined();
    });
  });
});
