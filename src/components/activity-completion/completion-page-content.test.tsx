import React from "react";
import { CompletionPageContent } from "./completion-page-content";
import IconCheck from "../../assets/svg-icons/icon-check.svg";
import { shallow } from "enzyme";
import {  Activity } from "../../types";
import _activityPlugins from "../../data/sample-activity-plugins.json";

const activityPlugins = _activityPlugins as Activity;

describe("Completion Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const quotedActivityName = `"test"`;
    const wrapperComplete = shallow(<CompletionPageContent activity={activityPlugins} activityName={"test"} isActivityComplete={true} onPageChange={stubFunction} showStudentReport={true} thumbnailURL={""} onActivityChange={stubFunction} onShowSequence={stubFunction}/>);
    expect(wrapperComplete.find('[data-cy="completion-page-content"]').length).toBe(1);
    expect(wrapperComplete.containsMatchingElement(<IconCheck width={32} height={32} className="check" />)).toEqual(true);
    expect(wrapperComplete.find('[data-cy="completion-text"]').length).toBe(1);
    expect(wrapperComplete.containsMatchingElement(<div>{`You have completed ${quotedActivityName} and you may exit now.`}</div>)).toEqual(true);

    const wrapperIncomplete = shallow(<CompletionPageContent activity={activityPlugins} activityName={"test"} isActivityComplete={false} onPageChange={stubFunction} showStudentReport={true} thumbnailURL={""} onActivityChange={stubFunction} onShowSequence={stubFunction}/>);
    expect(wrapperIncomplete.find('[data-cy="completion-page-content"]').length).toBe(1);
    expect(wrapperIncomplete.containsMatchingElement(<IconCheck width={32} height={32} className="check" />)).toEqual(false);
    expect(wrapperIncomplete.find('[data-cy="completion-text"]').length).toBe(0);
    expect(wrapperIncomplete.containsMatchingElement(<div>{`You haven't completed ${quotedActivityName} yet. You can go back to complete it, or you can exit.`}</div>)).toEqual(true);
    expect(wrapperIncomplete.containsMatchingElement(<div>{`It looks like you haven't quite finished ${quotedActivityName} yet. The answers you've given have been saved.`}</div>)).toEqual(true);
  });
});
