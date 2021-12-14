import React from "react";
import iframePhone from "iframe-phone";
import { Embeddable } from "./embeddable";
import { mount } from "enzyme";
import { EmbeddableType, IManagedInteractive } from "../../types";
import { DefaultManagedInteractive, DefaultXhtmlComponent, DefaultTEWindowshadeComponent } from "../../test-utils/model-for-tests";

jest.mock("use-resize-observer", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
}));

describe("Embeddable component", () => {
  const onSizeChange = jest.fn();
  it("renders a non-callout text component", () => {
    const embeddable: EmbeddableType = {
      ...DefaultXhtmlComponent,
      "content": "<p><strong>This is a page with full width layout</strong>.&nbsp;&nbsp;Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>",
      "is_callout": false,
      "is_half_width": false,
      "column": null
    };

    const wrapper = mount(<Embeddable embeddable={embeddable} questionNumber={1} sectionLayout={"responsive"} displayMode={"stacked"} pluginsLoaded={true} onSizeChange={onSizeChange}/>);
    expect(wrapper.find(".textbox").hasClass("callout")).toBe(false);
    expect(wrapper.text()).toContain("This is a page");
  });

  it("renders a callout text component", () => {
    const embeddable: EmbeddableType = {
      ...DefaultXhtmlComponent,
      "is_callout": true,
      "content": "<p>This is a callout text box.</p>",
      "column": null
    };

    const wrapper = mount(<Embeddable embeddable={embeddable} questionNumber={1} sectionLayout={"responsive"} displayMode={"stacked"} pluginsLoaded={true} onSizeChange={onSizeChange}/>);
    expect(wrapper.find(".textbox").hasClass("callout")).toBe(true);
    expect(wrapper.text()).toContain("This is a callout text box");
  });

  it("renders an empty managed interactive", () => {
    const embeddable: EmbeddableType = {
      ...DefaultManagedInteractive,
      library_interactive: null, // force to null for test, shouldn't be allowed on type,
      column: "primary"
    };

    const wrapper = mount(<Embeddable embeddable={embeddable} questionNumber={1} sectionLayout={"responsive"} displayMode={"stacked"} pluginsLoaded={true} onSizeChange={onSizeChange} />);
    expect(wrapper.text()).toContain("Content type not supported");
  });

  it("renders a managed interactive", () => {
    iframePhone.ParentEndpoint = jest.fn().mockImplementation(() => ({
      disconnect: jest.fn()
    }));

    const embeddable: EmbeddableType = {
      ...DefaultManagedInteractive,
      authored_state: `{"version":1,"questionType":"open_response","prompt":"<p>Write something:</p>"}`,
      ref_id: "123-ManagedInteractive",
      column: "primary"
    };
    // Disable interactive state observing for this test.
    (embeddable as IManagedInteractive).library_interactive!.data!.enable_learner_state = false;

    const wrapper = mount(<Embeddable embeddable={embeddable} questionNumber={1} sectionLayout={"responsive"} displayMode={"stacked"} pluginsLoaded={true} onSizeChange={onSizeChange} />);
    expect(wrapper.find("ManagedInteractive").length).toBe(1);
    expect(wrapper.find("iframe").length).toBe(1);
    expect(wrapper.find('[data-cy="iframe-runtime"]').length).toBe(1);
    expect(wrapper.html()).toContain("iframe-runtime");
  });

  it("renders nothing for a teacher edition window shade when not in teacher edition mode", () => {
    const embeddable: EmbeddableType = {
      ...DefaultTEWindowshadeComponent,
      column: null
    };

    const wrapper = mount(<Embeddable embeddable={embeddable} sectionLayout={"responsive"} displayMode={"stacked"} pluginsLoaded={true} onSizeChange={onSizeChange} />);
    expect(wrapper.html()).toBe(null);
  });

  it("renders HTML for a teacher edition window shade when in teacher edition mode", () => {
    const embeddable: EmbeddableType = {
      ...DefaultTEWindowshadeComponent,
      column: null
    };

    const wrapper = mount(<Embeddable embeddable={embeddable} teacherEditionMode={true} sectionLayout={"responsive"} displayMode={"stacked"} pluginsLoaded={true} onSizeChange={onSizeChange} />);
    expect(wrapper.html()).not.toBe(null);
    expect(wrapper.html()).toContain("embeddable");
    expect(wrapper.html()).toContain("plugin-container");
  });
});
