import React from "react";
import { Section } from "./section";
import { configure, fireEvent, render } from "@testing-library/react";
import { DefaultManagedInteractive, DefaultTestPage, DefaultTestSection, DefaultXhtmlComponent } from "../../test-utils/model-for-tests";
import { IEmbeddableXhtml, IManagedInteractive } from "../../types";
import { EmbeddableVisibilityContext } from "../embeddable-visibility-context";
import { IEmbeddableVisibilityTracker } from "../../utilities/embeddable-visibility-tracker";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

jest.mock("../../firebase-db", () => ({
  watchAnswer: (id: string, callback: (answer: null) => void) => { callback(null); return () => undefined; },
  getAnswer: () => Promise.resolve(null),
  watchQuestionLevelFeedback: () => () => undefined
}));

let mockTabBanner: "locked" | "unlocked" | undefined;
jest.mock("./disabled-questions-context", () => ({
  useQuestionLock: () => ({ disabled: false, locked: false }),
  useTabBanner: () => mockTabBanner
}));

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

  describe("visibility causes", () => {
    const tracker: IEmbeddableVisibilityTracker = { register: jest.fn(() => jest.fn()), queue: jest.fn() };
    const queue = tracker.queue as jest.Mock;

    beforeEach(() => queue.mockClear());

    const section = {
      ...DefaultTestSection,
      embeddables: [
        { ...DefaultXhtmlComponent, column: "primary", ref_id: "1-Embeddable::Xhtml" } as IEmbeddableXhtml,
        { ...DefaultXhtmlComponent, column: "secondary", ref_id: "2-Embeddable::Xhtml" } as IEmbeddableXhtml
      ],
      layout: "responsive-50-50",
      secondary_column_collapsible: true
    };

    const renderSection = (hiddenTab: boolean) => (
      <EmbeddableVisibilityContext.Provider value={tracker}>
        <Section
          activityLayout={2}
          section={section}
          page={{...DefaultTestPage}}
          pluginsLoaded={true}
          questionNumberStart={1}
          setNavigation={stubFunction}
          hiddenTab={hiddenTab}
        />
      </EmbeddableVisibilityContext.Provider>
    );

    it("queues columnToggle when the collapsible header is clicked", () => {
      const { getByTestId } = render(renderSection(false));
      expect(queue).not.toHaveBeenCalled();
      fireEvent.click(getByTestId("collapsible-header"));
      expect(queue.mock.calls).toEqual([["columnToggle"]]);
    });

    it("queues tabChange only when hiddenTab changes", () => {
      const { rerender } = render(renderSection(true));
      expect(queue).not.toHaveBeenCalled();
      rerender(renderSection(true));
      expect(queue).not.toHaveBeenCalled();
      rerender(renderSection(false));
      expect(queue.mock.calls).toEqual([["tabChange"]]);
    });
  });

  describe("split layout column order", () => {
    const question = (refId: string, column: "primary" | "secondary"): IManagedInteractive => ({
      ...DefaultManagedInteractive,
      ref_id: refId,
      name: refId,
      column
    });

    const renderSplitSection = (layout: string) => render(
      <DynamicTextTester>
        <Section
          activityLayout={0}
          page={{...DefaultTestPage}}
          pluginsLoaded={true}
          questionNumberStart={0}
          section={{ ...DefaultTestSection, layout, embeddables: [question("primary-q", "primary"), question("secondary-q", "secondary")] }}
          setNavigation={stubFunction}
        />
      </DynamicTextTester>
    );

    const precedes = (a: HTMLElement, b: HTMLElement) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

    it("renders and numbers the secondary column first in 40-60", () => {
      const { getByTestId, getByRole } = renderSplitSection("40-60");
      expect(precedes(getByTestId("section-column-secondary"), getByTestId("section-column-primary"))).toBe(true);
      expect(getByRole("heading", { name: "Question #1: secondary-q" })).toBeDefined();
      expect(getByRole("heading", { name: "Question #2: primary-q" })).toBeDefined();
    });

    it("renders and numbers the primary column first in 60-40", () => {
      const { getByTestId, getByRole } = renderSplitSection("60-40");
      expect(precedes(getByTestId("section-column-primary"), getByTestId("section-column-secondary"))).toBe(true);
      expect(getByRole("heading", { name: "Question #1: primary-q" })).toBeDefined();
      expect(getByRole("heading", { name: "Question #2: secondary-q" })).toBeDefined();
    });
  });

  describe("notebook tab banner", () => {
    afterEach(() => { mockTabBanner = undefined; });

    const renderSection = (layout: string) => render(
      <Section
        activityLayout={2}
        page={{...DefaultTestPage}}
        pluginsLoaded={true}
        questionNumberStart={0}
        section={{ ...DefaultTestSection, layout, embeddables: [{ ...DefaultXhtmlComponent, column: "primary" }] }}
        setNavigation={stubFunction}
      />
    );

    it.each([["split", "40-60", "section-split-layout"], ["single-column", "full-width", "section-single-column-layout"]])(
      "renders the tab banner as the first child of a %s section", (_, layout, testId) => {
        mockTabBanner = "locked";
        const sectionElement = renderSection(layout).getByTestId(testId);
        const banner = sectionElement.firstElementChild;
        expect(banner?.getAttribute("data-cy")).toBe("disabled-questions-banner");
        expect(banner?.classList.contains("tab")).toBe(true);
      }
    );

    it("renders no tab banner without one", () => {
      const { queryByTestId } = renderSection("40-60");
      expect(queryByTestId("disabled-questions-banner")).toBeNull();
    });
  });
});
