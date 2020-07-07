import React from "react";
import { SecondaryEmbeddable } from "./secondary-embeddable";
import { shallow } from "enzyme";

describe("Secondary Embeddable component", () => {
  it("renders component", () => {
    const embeddable = {
      "embeddable": {
        "default_text": null,
        "give_prediction_feedback": false,
        "hint": null,
        "is_full_width": false,
        "is_hidden": false,
        "is_prediction": false,
        "name": null,
        "prediction_feedback": null,
        "prompt": "Answer this open response question: why does ...",
        "show_in_featured_question_report": true,
        "type": "Embeddable::OpenResponse",
        "ref_id": "446697-Embeddable::OpenResponse"
      },
      "section": null
    };
    const wrapper = shallow(<SecondaryEmbeddable embeddable={embeddable} questionNumber={1} isFullWidth={embeddable.embeddable.is_full_width}/>);
    expect(wrapper.find('[data-cy="secondary-embeddable"]').length).toBe(1);
  });
});
