import React from "react";
import { shallow } from "enzyme";
import { SingleQuestionContent } from "./single-question-content";
import { Activity } from "../../types";
import { DefaultTestActivity, DefaultTestPage, DefaultTestSection, DefaultManagedInteractive } from "../../test-utils/model-for-tests";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

describe("SingleQuestionContent component", () => {
  const createActivity = (pages: any[] = []): Activity => ({
    ...DefaultTestActivity,
    id: 123,
    name: "Test Activity",
    description: "Test description",
    pages
  });

  it("renders component", () => {
    const activity = createActivity();
    const wrapper = shallow(
      <DynamicTextTester>
        <SingleQuestionContent
          activity={activity}
          userName="Test User"
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );
    expect(wrapper.find(SingleQuestionContent).exists()).toBe(true);
  });

  it("renders with pages containing embeddables", () => {
    const activity = createActivity([{
      ...DefaultTestPage,
      id: 1,
      name: "Page 1",
      sections: [{
        ...DefaultTestSection,
        embeddables: [
          { ...DefaultManagedInteractive, ref_id: "q1", name: "Question 1" }
        ]
      }]
    }]);

    const wrapper = shallow(
      <DynamicTextTester>
        <SingleQuestionContent
          activity={activity}
          userName="Test User"
          pluginsLoaded={true}
        />
      </DynamicTextTester>
    );

    expect(wrapper.find(SingleQuestionContent).exists()).toBe(true);
  });

  it("accepts teacherEditionMode prop", () => {
    const activity = createActivity();
    const wrapper = shallow(
      <DynamicTextTester>
        <SingleQuestionContent
          activity={activity}
          userName="Teacher"
          pluginsLoaded={true}
          teacherEditionMode={true}
        />
      </DynamicTextTester>
    );
    expect(wrapper.find(SingleQuestionContent).props()).toHaveProperty("teacherEditionMode", true);
  });

  it("passes correct props to SingleQuestionContent", () => {
    const activity = createActivity();
    const wrapper = shallow(
      <DynamicTextTester>
        <SingleQuestionContent
          activity={activity}
          userName="Test User"
          pluginsLoaded={false}
        />
      </DynamicTextTester>
    );

    const props = wrapper.find(SingleQuestionContent).props();
    expect(props.activity).toBe(activity);
    expect(props.userName).toBe("Test User");
    expect(props.pluginsLoaded).toBe(false);
  });
});
