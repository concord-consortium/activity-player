import React from "react";
import { ActivityNav } from "./activity-nav";
import { shallow } from "enzyme";
import { render, screen } from "@testing-library/react";
import { DefaultTestPage } from "../../test-utils/model-for-tests";
import { NavPages } from "./nav-pages";

// NavPages subscribes to feedback watchers; the full RTL render below runs those
// effects, so stub firebase-db (same approach as nav-pages.test.tsx).
jest.mock("../../firebase-db", () => ({
  watchActivityLevelFeedback: jest.fn(() => jest.fn()),
  watchQuestionLevelFeedback: jest.fn(() => jest.fn()),
}));

const stubFunction = () => {
  // do nothing.
};
const activityPages = [
  {...DefaultTestPage, name: "1"},
  {...DefaultTestPage, name: "2"},
  {...DefaultTestPage, name: "3"},
];

describe("Activity Nav Header component", () => {
  it("renders nav header content for activity", () => {
    const wrapper = shallow(<ActivityNav activityPages={activityPages} currentPage={0} onPageChange={stubFunction} singlePage={false} />);
    expect(wrapper.containsMatchingElement(<NavPages
      pages={activityPages}
      onPageChange={stubFunction}
      currentPage={0}
    />)).toEqual(true);
  });
  it("exposes a navigation landmark with the default label", () => {
    render(<ActivityNav activityPages={activityPages} currentPage={0} onPageChange={stubFunction} singlePage={false} />);
    expect(screen.getByRole("navigation", { name: "Page navigation" })).toBeInTheDocument();
  });
  it("honors a custom ariaLabel (used to distinguish the bottom nav)", () => {
    render(<ActivityNav activityPages={activityPages} currentPage={0} onPageChange={stubFunction} singlePage={false} ariaLabel="Page navigation, bottom" />);
    expect(screen.getByRole("navigation", { name: "Page navigation, bottom" })).toBeInTheDocument();
  });
});
