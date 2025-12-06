import React from "react";
import { Section } from "./section";
import { configure, render } from "@testing-library/react";
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
});
