import React from "react";
import { ActivityPageContent } from "./activity-page-content";
import { shallow } from "enzyme";

describe("Activity Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const page = { layout: "l-responsive", embeddables: [] };
    const wrapper = shallow(<ActivityPageContent
      isFirstActivityPage={false}
      isLastActivityPage={false}
      onPageChange={stubFunction}
      page={page}
      pageNumber={5}
      totalPreviousQuestions={5}
    />);
    expect(wrapper.find('[data-cy="page-content"]').length).toBe(1);
  });
});
