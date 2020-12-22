import React from "react";
import { BottomButtons } from "./bottom-buttons";
import { shallow } from "enzyme";

describe("Bottom Buttons component", () => {
  it("renders bottom buttons", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapperBackNext = shallow(<BottomButtons onGenerateReport={stubFunction} />);
    expect(wrapperBackNext.find('[data-cy="bottom-button-report"]').length).toBe(1);
  });
});
