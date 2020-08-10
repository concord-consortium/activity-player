import React from "react";
import { waitFor } from "@testing-library/dom";
import { Embeddable } from "./embeddable";
import { PageLayouts } from "../../utilities/activity-utils";
import { mount, ReactWrapper } from "enzyme";
import { EmbeddableWrapper } from "../../types";
import { act } from "react-dom/test-utils";

describe("Embeddable component", () => {
  it("renders component", async () => {
    const embeddableWrapper: EmbeddableWrapper = {
      "embeddable": {
        "content": "<p><strong>This is a page with full width layout</strong>.&nbsp;&nbsp;Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>",
        "is_full_width": true,
        "is_hidden": false,
        "name": "",
        "type": "Embeddable::Xhtml",
        "ref_id": "271776-Embeddable::Xhtml"
      },
      "section": "header_block"
    };

    let wrapper: ReactWrapper;
    await act(async () => {
      wrapper = mount(<Embeddable embeddableWrapper={embeddableWrapper} isPageIntroduction={false} questionNumber={1} pageLayout={PageLayouts.Responsive}/>);
      expect(wrapper.containsMatchingElement(<div>Loading...</div>)).toEqual(true);
    });

    await waitFor(() => {
      expect(wrapper.text()).toContain("This is a page");
    });
  });
});
