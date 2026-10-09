import React from "react";
import { configure, render, screen } from "@testing-library/react";
import { DisabledQuestionsBanner } from "./disabled-questions-banner";

configure({ testIdAttribute: "data-cy" });

const lockedBanner = { state: "locked", text: "Run the model first." } as const;
const unlockedBanner = { state: "unlocked", text: "Go ahead." } as const;

describe("DisabledQuestionsBanner", () => {
  it("shows the locked text, then the unlocked text in the same element", () => {
    const { rerender } = render(<DisabledQuestionsBanner banner={lockedBanner} />);
    const status = screen.getByTestId("disabled-questions-banner");
    expect(status.textContent).toBe("Run the model first.");
    expect(status.classList.contains("locked")).toBe(true);

    rerender(<DisabledQuestionsBanner banner={unlockedBanner} />);
    expect(screen.getByTestId("disabled-questions-banner")).toBe(status);
    expect(status.textContent).toBe("Go ahead.");
    expect(status.classList.contains("unlocked")).toBe(true);
    expect(status.classList.contains("locked")).toBe(false);
  });

  it("hides the icon from assistive technology", () => {
    const { container } = render(<DisabledQuestionsBanner banner={lockedBanner} />);
    const icon = container.querySelector(".disabled-questions-banner .icon-line > :first-child");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("marks the notebook tab variant", () => {
    render(<DisabledQuestionsBanner banner={lockedBanner} tab />);
    expect(screen.getByTestId("disabled-questions-banner").classList.contains("tab")).toBe(true);
  });

  it("is not a live region, since the page announces unlocks once from a region of its own", () => {
    render(<DisabledQuestionsBanner banner={unlockedBanner} />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
