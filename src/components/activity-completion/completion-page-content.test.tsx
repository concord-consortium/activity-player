import React from "react";
import { CompletionPageContent } from "./completion-page-content";
import { shallow } from "enzyme";
import { act, render, screen } from "@testing-library/react";
import { Activity } from "../../types";
import _activityPlugins from "../../data/version-2/sample-new-sections-multiple-layout-types.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

// The full RTL render runs the answer/feedback watcher effects, so stub
// firebase-db (same approach as nav-pages.test.tsx). The answers watcher's callback
// is captured so a test can deliver answers and exercise the rendered status banner;
// until it is invoked, the component renders its "Fetching your data" state.
let mockAnswersCallback: ((answers: unknown[]) => void) | undefined;
jest.mock("../../firebase-db", () => ({
  watchAllAnswers: jest.fn((cb: (answers: unknown[]) => void) => { mockAnswersCallback = cb; return jest.fn(); }),
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
  it("hides the decorative completion status icon from assistive technology", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const { container } = render(
      <DynamicTextTester>
        <CompletionPageContent
          activity={activityPlugins}
          activityName={"test"}
          onPageChange={stubFunction}
        />
      </DynamicTextTester>
    );
    // Deliver answers so the component leaves its "Fetching your data" state and renders the
    // status banner. With no questions in the activity it is "complete", showing the check icon.
    // The adjacent progress text conveys completion, so the icon itself is decorative.
    act(() => {
      mockAnswersCallback?.([]);
    });
    const icon = container.querySelector("test-file-stub");
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
    expect(icon?.getAttribute("focusable")).toBe("false");
  });
});
