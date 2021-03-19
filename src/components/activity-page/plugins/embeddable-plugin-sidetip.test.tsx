import React from "react";
import { EmbeddablePluginSideTip } from "./embeddable-plugin-sidetip";
import { shallow } from "enzyme";
import { IEmbeddablePlugin } from "../../../types";

describe("Embeddable Sidetip component", () => {
  it("renders component", () => {
    const embeddable: IEmbeddablePlugin = {
      "plugin": {
        "description": null,
        "author_data": "{\"tipType\":\"sideTip\",\"sideTip\":{\"content\":\"this is a sidetip\",\"mediaType\":\"none\",\"mediaURL\":\"\"}}",
        "approved_script_label": "teacherEditionTips",
        "component_label": "sideTip",
        "approved_script": {
          "name": "Teacher Edition",
          "url": "https://example.com/plugin.js",
          "label": "teacherEditionTips",
          "description": "Teacher Edition Plugin",
          "version": "1.0.0",
          "json_url": "https://example.com/manifest.json",
          "authoring_metadata": "{}"
        }
      },
      "is_hidden": false,
      "is_full_width": false,
      "type": "Embeddable::EmbeddablePlugin",
      "ref_id": "2991-Embeddable::EmbeddablePlugin"
    };
    const wrapper = shallow(<EmbeddablePluginSideTip embeddable={embeddable} offlineMode={false} />);
    expect(wrapper.find('[data-cy="embeddable-plugin-sidetip"]').length).toBe(1);
  });
});
