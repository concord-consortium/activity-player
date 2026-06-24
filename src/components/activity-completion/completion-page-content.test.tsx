import React from "react";
import { CompletionPageContent } from "./completion-page-content";
import { shallow } from "enzyme";
import { render, screen } from "@testing-library/react";
import { Activity } from "../../types";
import _activityPlugins from "../../data/version-2/sample-new-sections-multiple-layout-types.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

// The full RTL render runs the answer/feedback watcher effects, so stub
// firebase-db (same approach as nav-pages.test.tsx). With no answers delivered,
// the component renders its "Fetching your data" state, which still has a <main>.
jest.mock("../../firebase-db", () => ({
  watchAllAnswers: jest.fn(() => jest.fn()),
  watchQuestionLevelFeedback: jest.fn(() => jest.fn()),
}));

const activityPlugins = _activityPlugins as unknown as Activity;

describe("Completion Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapperComplete = shallow(
                              <DynamicTextTester>
                                <CompletionPageContent
                                  activity={activityPlugins}
                                  activityName={"test"}
                                  onPageChange={stubFunction}
                                />
                              </DynamicTextTester>
                            );
    expect(wrapperComplete.html()).toContain('data-cy="completion-page-content"');
    expect(wrapperComplete.html()).toContain('data-cy="progress-container"');
    expect(wrapperComplete.html()).toContain("Fetching your data");
  });
  it("exposes a single main landmark", () => {
    const stubFunction = () => {
      // do nothing.
    };
    render(
      <DynamicTextTester>
        <CompletionPageContent
          activity={activityPlugins}
          activityName={"test"}
          onPageChange={stubFunction}
        />
      </DynamicTextTester>
    );
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
