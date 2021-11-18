import React from "react";
import { Section } from "./section";
import { configure, render } from "@testing-library/react";
import { DefaultTestSection } from "../../test-utils/model-for-tests";

describe("Section component", () => {
  it("renders section component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const section = { ...DefaultTestSection, layout: "l-responsive" };
    configure({ testIdAttribute: "data-cy" });
    const { getByTestId } = render(<Section
      section={section}
      activityLayout={0}
      questionNumberStart={5}
      setNavigation={stubFunction}
      pluginsLoaded={true}
    />);
    expect(getByTestId("section-split-layout")).toBeDefined();
    expect(getByTestId("section-column-primary")).toBeDefined();
    expect(getByTestId("section-column-secondary")).toBeDefined();
  });
});
