import React from "react";
import { IntroductionPageContent } from "./introduction-page-content";
import { shallow } from "enzyme";
import { render, screen } from "@testing-library/react";
import { DefaultTestActivity } from "../../test-utils/model-for-tests";
import { DynamicTextTester } from "../../test-utils/dynamic-text";

describe("Introduction Page Content component", () => {
  it("renders component", () => {
    const stubFunction = () => {
      // do nothing.
    };
    const wrapper = shallow(<IntroductionPageContent activity={DefaultTestActivity} onPageChange={stubFunction} />);
    expect(wrapper.find('[data-cy="intro-page-content"]').length).toBe(1);
  });
  it("exposes a single main landmark", () => {
    const stubFunction = () => {
      // do nothing.
    };
    render(<DynamicTextTester><IntroductionPageContent activity={DefaultTestActivity} onPageChange={stubFunction} /></DynamicTextTester>);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });
});
