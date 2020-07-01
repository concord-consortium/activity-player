import React from "react";
import { BottomButtons } from "./bottom-buttons";
import { shallow } from "enzyme";

describe("Bottom Buttons component", () => {
  it("renders bottom buttons", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapperBackNext = shallow(<BottomButtons onBack={stubFunction} onNext={stubFunction} />);

    expect(wrapperBackNext.find('[data-cy="bottom-button-back"]').length).toBe(1);
    expect(wrapperBackNext.find('[data-cy="bottom-button-next"]').length).toBe(1);

    const wrapperBack = shallow(<BottomButtons onBack={stubFunction} />);

    expect(wrapperBack.find('[data-cy="bottom-button-back"]').length).toBe(1);
    expect(wrapperBack.find('[data-cy="bottom-button-next"]').length).toBe(0);

    const wrapperNext = shallow(<BottomButtons onNext={stubFunction} />);

    expect(wrapperNext.find('[data-cy="bottom-button-back"]').length).toBe(0);
    expect(wrapperNext.find('[data-cy="bottom-button-next"]').length).toBe(1);

  });
});
