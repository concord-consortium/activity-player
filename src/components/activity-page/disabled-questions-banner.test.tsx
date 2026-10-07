import React from "react";
import { configure, render, screen } from "@testing-library/react";
import { DisabledQuestionsBanner, kLockedBannerText, kUnlockedBannerText } from "./disabled-questions-banner";

configure({ testIdAttribute: "data-cy" });

describe("DisabledQuestionsBanner", () => {
  it("shows the locked text, then the unlocked text in the same element", () => {
    const { rerender } = render(<DisabledQuestionsBanner state="locked" />);
    const status = screen.getByTestId("disabled-questions-banner");
    expect(status.textContent).toBe(kLockedBannerText);
    expect(status.classList.contains("locked")).toBe(true);

    rerender(<DisabledQuestionsBanner state="unlocked" />);
    expect(screen.getByTestId("disabled-questions-banner")).toBe(status);
    expect(status.textContent).toBe(kUnlockedBannerText);
    expect(status.classList.contains("unlocked")).toBe(true);
    expect(status.classList.contains("locked")).toBe(false);
  });

  it("hides the icon from assistive technology", () => {
    const { container } = render(<DisabledQuestionsBanner state="locked" />);
    const icon = container.querySelector(".disabled-questions-banner > :first-child");
    expect(icon?.getAttribute("aria-hidden")).toBe("true");
  });

  it("marks the notebook tab variant", () => {
    render(<DisabledQuestionsBanner state="locked" tab />);
    expect(screen.getByTestId("disabled-questions-banner").classList.contains("tab")).toBe(true);
  });

  it("is not a live region, since the page announces unlocks once from a region of its own", () => {
    render(<DisabledQuestionsBanner state="unlocked" />);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
