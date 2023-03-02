import React from "react";
import { ActivityPageContent } from "./activity-page-content";
import { configure, render } from "@testing-library/react";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

describe("Activity Page Content component", () => {
  const stubFunction = () => {
    // do nothing.
  };
  const page = { ...DefaultTestPage, layout: "l-responsive" };
  configure({ testIdAttribute: "data-cy" });

  it("renders component", () => {
    const { getByTestId, queryAllByTestId } = render(
      <DynamicTextTester>
        <ActivityPageContent
          enableReportButton={false}
          activityLayout={0}
          page={page}
          pageNumber={5}
          totalPreviousQuestions={5}
          setNavigation={stubFunction}
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    expect(getByTestId("page-content")).toBeDefined();

    const notifications = queryAllByTestId("page-change-notification");
    expect(notifications.length).toBe(0);
  });

  describe("with page change notification", () => {
    it("renders page change started notification", () => {
      const { getAllByTestId } = render(
        <DynamicTextTester>
          <ActivityPageContent
            enableReportButton={false}
            activityLayout={0}
            page={page}
            pageNumber={5}
            totalPreviousQuestions={5}
            setNavigation={stubFunction}
            pluginsLoaded={true}
            pageChangeNotification={{state: "started"}}
          />
        </DynamicTextTester>
      );
      const notifications = getAllByTestId("page-change-notification");
      expect(notifications.length).toBe(2);
      expect(notifications[0].textContent).toBe("Please wait, your work is being saved...");
    });

    it("renders page change errored notification", () => {
      const { getAllByTestId } = render(
        <DynamicTextTester>
          <ActivityPageContent
            enableReportButton={false}
            activityLayout={0}
            page={page}
            pageNumber={5}
            totalPreviousQuestions={5}
            setNavigation={stubFunction}
            pluginsLoaded={true}
            pageChangeNotification={{state: "errored", message: "Test error message!"}}
          />
        </DynamicTextTester>
      );
      const notifications = getAllByTestId("page-change-notification");
      expect(notifications.length).toBe(2);
      expect(notifications[0].textContent).toBe("Test error message!");
    });
  });
});
