import React from "react";
import { ActivityPageContent } from "./activity-page-content";
import { configure, fireEvent, render } from "@testing-library/react";
import { DefaultTestPage } from "../../test-utils/model-for-tests";

describe("Activity Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const page = { ...DefaultTestPage, layout: "l-responsive" };
    configure({ testIdAttribute: "data-cy" });
    const { getByTestId, getByText } = render(<ActivityPageContent
      enableReportButton={false}
      activityLayout={0}
      page={page}
      pageNumber={5}
      totalPreviousQuestions={5}
      setNavigation={stubFunction}
      pluginsLoaded={true}
    />);
    expect(getByTestId("page-content")).toBeDefined();
    expect(getByText("Hide")).toBeEnabled();
    fireEvent.click(getByText("Hide"));
    expect(getByText("Show")).toBeEnabled();
  });
});
