import React from "react";
import { Section } from "./section";
import { configure, fireEvent, render } from "@testing-library/react";
import { DefaultTestSection } from "../../test-utils/model-for-tests";

describe("Section component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const section = { ...DefaultTestSection, layout: "l-responsive" };
    configure({ testIdAttribute: "data-cy" });
    const { getByTestId, getByText } = render(<Section
      section={section}
      questionNumberStart={5}
      setNavigation={stubFunction}
      pluginsLoaded={true}
    />);
    expect(getByTestId("section-single-column-layout")).toBeDefined();
    // expect(getByText("Hide")).toBeEnabled();
    // fireEvent.click(getByText("Hide"));
    // expect(getByText("Show")).toBeEnabled();
  });
});
