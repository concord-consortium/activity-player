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
});
