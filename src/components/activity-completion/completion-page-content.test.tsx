import React from "react";
import { CompletionPageContent } from "./completion-page-content";
import { shallow } from "enzyme";
import { Activity } from "../../types";
import _activityPlugins from "../../data/version-2/sample-new-sections-multiple-layout-types.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

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
});
