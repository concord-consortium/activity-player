import React from "react";
import { EmbeddablePlugin } from "./embeddable-plugin";
import { shallow } from "enzyme";
import { IEmbeddablePlugin } from "../../../types";

describe("Embeddable component", () => {
  it("renders component", () => {
    const embeddable: IEmbeddablePlugin = {
      "plugin": {
        "description": null,
        "author_data": "{\"tipType\":\"windowShade\",\"windowShade\":{\"windowShadeType\":\"theoryAndBackground\",\"layout\":\"mediaLeft\",\"initialOpenState\":true,\"content\":\"this is a windowshade\",\"content2\":\"\",\"mediaType\":\"none\",\"mediaCaption\":\"Last, First. \\\"Title of Work.\\\" Year created. Site Title [OR] Publisher. Gallery [OR] Location. http://www.url.com.\",\"mediaURL\":\"\"}}",
        "approved_script_label": "teacherEditionTips",
        "component_label": "windowShade"
      },
      "is_hidden": false,
      "is_full_width": false,
      "type": "Embeddable::EmbeddablePlugin",
      "ref_id": "2991-Embeddable::EmbeddablePlugin"
    };
    const wrapper = shallow(<EmbeddablePlugin embeddable={embeddable} pluginsLoaded={true} />);
    expect(wrapper.find('[data-cy="embeddable-plugin"]').length).toBe(1);
  });
});
