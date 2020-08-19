import React from "react";
import { ManagedInteractive } from "./managed-interactive";
import { Embeddable } from "../../../types";
import { shallow } from "enzyme";

describe("ManagedInteractive component", () => {
  it("renders component", () => {
    const sampleEmbeddable: Embeddable = {
      name: "mc question",
      url_fragment: null,
      authored_state: "{\"version\":1,\"questionType\":\"multiple_choice\",\"multipleAnswers\":false,\"layout\":\"vertical\",\"choices\":[{\"id\":\"1\",\"content\":\"Choice A\",\"correct\":false},{\"id\":\"2\",\"content\":\"Choice B\",\"correct\":false},{\"id\":\"3\",\"content\":\"Choice C\",\"correct\":false}],\"prompt\":\"<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>\",\"hint\":\"<p>this is a hint</p>\"}",
      is_hidden: false,
      is_full_width: true,
      show_in_featured_question_report: true,
      inherit_aspect_ratio_method: true,
      custom_aspect_ratio_method: "DEFAULT",
      inherit_native_width: true,
      custom_native_width: 576,
      inherit_native_height: true,
      custom_native_height: 435,
      inherit_click_to_play: true,
      custom_click_to_play: false,
      inherit_full_window: true,
      custom_full_window: false,
      inherit_click_to_play_prompt: true,
      custom_click_to_play_prompt: null,
      inherit_image_url: true,
      custom_image_url: null,
      library_interactive: {
        hash: "af5d1860b2d4a037ae01e3d86931a30886fcb42d",
        data: {
          aspect_ratio_method: "DEFAULT",
          authoring_guidance: "",
          base_url: "https://models-resources.concord.org/question-interactives/branch/master/multiple-choice/",
          click_to_play: false,
          click_to_play_prompt: null,
          description: "A basic multiple choice interactive. This is pointing to the master branch and is in development so it shouldn't be used by real activities. \r\n",
          enable_learner_state: true,
          full_window: false,
          has_report_url: false,
          image_url: null,
          name: "Multiple Choice (master)",
          native_height: 435,
          native_width: 576,
          no_snapshots: false,
          show_delete_data_button: false,
          thumbnail_url: "",
          customizable: true,
          authorable: true
        }
      },
      type: "ManagedInteractive",
      ref_id: "314-ManagedInteractive"
    };
    const wrapper = shallow(<ManagedInteractive embeddable={sampleEmbeddable} initialInteractiveState={null} questionNumber={1} />);
    expect(wrapper.find('[data-cy="managed-interactive"]').length).toBe(1);
  });
});
