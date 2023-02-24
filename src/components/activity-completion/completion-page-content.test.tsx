import React from "react";
import { CompletionPageContent } from "./completion-page-content";
import { mount } from "enzyme";
import { Activity } from "../../types";
import _activityPlugins from "../../data/version-2/sample-new-sections-multiple-layout-types.json";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

const activityPlugins = _activityPlugins as unknown as Activity;

describe("Completion Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapperComplete = mount(
                              <DynamicTextTester>
                                <CompletionPageContent activity={activityPlugins}
                                                       activityName={"test"}
                                                       onPageChange={stubFunction}
                                                       showStudentReport={true}/>
                              </DynamicTextTester>
                            );
    expect(wrapperComplete.find('[data-cy="completion-page-content"]').length).toBe(1);
    expect(wrapperComplete.find('[data-cy="progress-container"]').length).toBe(1);
    expect(wrapperComplete.find('[data-cy="completion-page-content"]').text()).toContain("Fetching your data");
  });
});
