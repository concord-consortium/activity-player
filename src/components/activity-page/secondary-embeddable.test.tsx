import React from "react";
import { SecondaryEmbeddable } from "./secondary-embeddable";
import { shallow } from "enzyme";

describe("Secondary Embeddable component", () => {
  it("renders component", () => {
    const embeddable = {
      "embeddable": {
        "name": "",
        "url_fragment": null,
        "authored_state": "{\"version\":1,\"questionType\":\"multiple_choice\",\"multipleAnswers\":false,\"layout\":\"horizontal\",\"choices\":[{\"id\":\"1\",\"content\":\"Dino\",\"correct\":false},{\"id\":\"2\",\"content\":\"Astro\",\"correct\":false},{\"id\":\"3\",\"content\":\"Pluto\",\"correct\":true}],\"prompt\":\"\u003Cp\u003EManaged Interactive Multiple choice horizontal layout, single answer, not required, no hint. Correct answer specified but no custom feedback\u003C/p\u003E\"}",
        "is_hidden": false,
        "is_full_width": true,
        "show_in_featured_question_report": true,
        "inherit_aspect_ratio_method": true,
        "custom_aspect_ratio_method": "DEFAULT",
        "inherit_native_width": true,
        "custom_native_width": 576,
        "inherit_native_height": true,
        "custom_native_height": 435,
        "inherit_click_to_play": true,
        "custom_click_to_play": false,
        "inherit_full_window": true,
        "custom_full_window": false,
        "inherit_click_to_play_prompt": true,
        "custom_click_to_play_prompt": null,
        "inherit_image_url": true,
        "custom_image_url": null,
        "library_interactive": {
          "hash": "af5d1860b2d4a037ae01e3d86931a30886fcb42d",
          "data": {
            "aspect_ratio_method": "DEFAULT",
            "authoring_guidance": "",
            "base_url": "https://models-resources.concord.org/question-interactives/branch/master/multiple-choice/",
            "click_to_play": false,
            "click_to_play_prompt": null,
            "description": "A basic multiple choice interactive. This is pointing to the master branch and is in development so it shouldn't be used by real activities. \r\n",
            "enable_learner_state": true,
            "full_window": false,
            "has_report_url": false,
            "image_url": null,
            "name": "Multiple Choice (master)",
            "native_height": 435,
            "native_width": 576,
            "no_snapshots": false,
            "show_delete_data_button": false,
            "thumbnail_url": "",
            "customizable": true,
            "authorable": true
          }
        },
        "type": "ManagedInteractive",
        "ref_id": "295-ManagedInteractive"
      },
      "section": null
    };
    const wrapper = shallow(<SecondaryEmbeddable embeddable={embeddable} questionNumber={1} isFullWidth={embeddable.embeddable.is_full_width}/>);
    expect(wrapper.find('[data-cy="secondary-embeddable"]').length).toBe(1);
  });
});
