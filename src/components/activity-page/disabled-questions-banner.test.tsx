import React from "react";
import { render, screen } from "@testing-library/react";
import { DisabledQuestionsBanner, kLockedBannerText, kUnlockedBannerText } from "./disabled-questions-banner";

describe("DisabledQuestionsBanner", () => {
  it("shows the locked text, then the unlocked text in the same live region", () => {
    const { rerender } = render(<DisabledQuestionsBanner state="locked" />);
    const status = screen.getByRole("status");
    expect(status.textContent).toBe(kLockedBannerText);
    expect(status.classList.contains("locked")).toBe(true);

    rerender(<DisabledQuestionsBanner state="unlocked" />);
    expect(screen.getByRole("status")).toBe(status);
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
    expect(screen.getByRole("status").classList.contains("tab")).toBe(true);
  });
});
