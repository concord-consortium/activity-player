import React from "react";
import { ActivityPageContent } from "./activity-page-content";
import { configure, fireEvent, render } from "@testing-library/react";
import { DefaultTestPage } from "../../test-utils/model-for-tests";

describe("Activity Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    let callCount = 0;
    const handlePageChange = () => {
      ++callCount;
    };
    const page = { ...DefaultTestPage, layout: "l-responsive" };
    configure({ testIdAttribute: "data-cy" });
    const { getByTestId, getByText } = render(<ActivityPageContent
      enableReportButton={false}
      isFirstActivityPage={false}
      isLastActivityPage={false}
      onPageChange={handlePageChange}
      page={page}
      pageNumber={5}
      totalPreviousQuestions={5}
      setNavigation={stubFunction}
    />);
    expect(getByTestId("page-content")).toBeDefined();
    expect(getByTestId("bottom-button-back")).toBeEnabled();
    expect(getByTestId("bottom-button-next")).toBeEnabled();
    expect(getByText("Hide")).toBeEnabled();
    fireEvent.click(getByText("Hide"));
    expect(getByText("Show")).toBeEnabled();
    expect(callCount).toBe(0);
    fireEvent.click(getByTestId("bottom-button-back"));
    expect(callCount).toBe(1);
    fireEvent.click(getByTestId("bottom-button-next"));
    expect(callCount).toBe(2);
  });
});
