import React from "react";
import { GlossaryPlugin } from "./glossary-plugin";
import { shallow } from "enzyme";
import { IEmbeddablePlugin } from "../../../types";

describe("Glossary Plugin component", () => {
  it("renders component", () => {
    const embeddable: IEmbeddablePlugin = {
      "plugin": {
        "description": null,
        "author_data": "{\"version\":\"1.0\",\"glossaryResourceId\":\"ISnn8j8r2veEFjPCx3XH\",\"s3Url\":\"https://token-service-files.s3.amazonaws.com/glossary-plugin/ISnn8j8r2veEFjPCx3XH/glossary.json\"}",
        "approved_script_label": "glossary",
        "component_label": "glossary",
        "approved_script": {
          "name": "Glossary",
          "url": "https://example.com/plugin.js",
          "label": "glossary",
          "description": "Glossary Plugin",
          "version": "1.0.0",
          "json_url": "https://example.com/manifest.json",
          "authoring_metadata": "{}"
        }
      },
      "is_hidden": false,
      "is_full_width": false,
      "type": "Embeddable::EmbeddablePlugin",
      "ref_id": ""
    };
    const wrapper = shallow(<GlossaryPlugin embeddable={embeddable} pageNumber={1} />);
    expect(wrapper.find('[data-cy="glossary-embeddable-plugin"]').length).toBe(1);
  });
});
