import React from "react";
import { EmbeddablePlugin } from "./embeddable-plugin";
import { shallow } from "enzyme";
import { IEmbeddablePlugin } from "../../../types";
import { DefaultTEWindowshadeComponent } from "../../../test-utils/model-for-tests";

describe("Embeddable component", () => {
  it("renders component", () => {
    const embeddable: IEmbeddablePlugin = {
      ...DefaultTEWindowshadeComponent
    };
    const wrapper = shallow(<EmbeddablePlugin embeddable={embeddable} pluginsLoaded={true} />);
    expect(wrapper.find('[data-cy="embeddable-plugin"]').length).toBe(1);
  });

  it("when the embeddable plugin is a glossary, it renders the glossary plugin component", () => {
    const embeddable: IEmbeddablePlugin = {
      "plugin": {
        "id": 1,
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
      "is_half_width": false,
      "type": "Embeddable::EmbeddablePlugin",
      "ref_id": ""
    };
    const wrapper = shallow(<EmbeddablePlugin embeddable={embeddable} pageNumber={1} pluginsLoaded={true} />);
    expect(wrapper.find('[data-cy="glossary-embeddable-plugin"]').length).toBe(1);
  });
});
