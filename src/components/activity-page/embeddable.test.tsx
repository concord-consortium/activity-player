import React from "react";
import iframePhone from "iframe-phone";
import { Embeddable } from "./embeddable";
import { PageLayouts, EmbeddableSections } from "../../utilities/activity-utils";
import { mount } from "enzyme";
import { EmbeddableWrapper, IManagedInteractive } from "../../types";
import { DefaultManagedInteractive, DefaultXhtmlComponent } from "../../test-utils/model-for-tests";

describe("Embeddable component", () => {
  it("renders a non-callout text component", () => {
    const embeddableWrapper: EmbeddableWrapper = {
      "embeddable": {
        ...DefaultXhtmlComponent,
        "content": "<p><strong>This is a page with full width layout</strong>.&nbsp;&nbsp;Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>",
        "is_callout": false,
        "is_full_width": true
      },
      "section": "header_block"
    };

    const wrapper = mount(<Embeddable embeddableWrapper={embeddableWrapper} questionNumber={1} pageLayout={PageLayouts.Responsive} pageSection={EmbeddableSections.InfoAssessment}/>);
    expect(wrapper.find(".textbox").hasClass("callout")).toBe(false);
    expect(wrapper.text()).toContain("This is a page");
  });

  it("renders a callout text component", () => {
    const embeddableWrapper: EmbeddableWrapper = {
      "embeddable": {
        ...DefaultXhtmlComponent,
        "is_callout": true,
        "content": "<p>This is a callout text box.</p>"
      },
      "section": "header_block"
    };

    const wrapper = mount(<Embeddable embeddableWrapper={embeddableWrapper} questionNumber={1} pageLayout={PageLayouts.Responsive} pageSection={EmbeddableSections.InfoAssessment}/>);
    expect(wrapper.find(".textbox").hasClass("callout")).toBe(true);
    expect(wrapper.text()).toContain("This is a callout text box");
  });

  it("renders an empty managed interactive", () => {
    const embeddableWrapper: EmbeddableWrapper = {
      "embeddable": {
        ...DefaultManagedInteractive,
        library_interactive: null // force to null for test, shouldn't be allowed on type
      },
      "section": "interactive_box"
    };

    const wrapper = mount(<Embeddable embeddableWrapper={embeddableWrapper} questionNumber={1} pageLayout={PageLayouts.Responsive} pageSection={EmbeddableSections.InfoAssessment}/>);
    expect(wrapper.text()).toContain("Content type not supported");
  });

  it("renders a managed interactive", () => {
    iframePhone.ParentEndpoint = jest.fn().mockImplementation(() => ({
      disconnect: jest.fn()
    }));

    const embeddableWrapper: EmbeddableWrapper = {
      "embeddable": {
        ...DefaultManagedInteractive,
        authored_state: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
        ref_id: "123-ManagedInteractive"
      },
      "section": "interactive_box"
    };
    // Disable interactive state observing for this test.
    (embeddableWrapper.embeddable as IManagedInteractive).library_interactive!.data!.enable_learner_state = false;

    const wrapper = mount(<Embeddable embeddableWrapper={embeddableWrapper} questionNumber={1} pageLayout={PageLayouts.Responsive} pageSection={EmbeddableSections.InfoAssessment}/>);
    expect(wrapper.find("ManagedInteractive").length).toBe(1);
    expect(wrapper.find("iframe").length).toBe(1);
    expect(wrapper.find('[data-cy="iframe-runtime"]').length).toBe(1);
    expect(wrapper.html()).toContain("iframe-runtime");
  });
});
