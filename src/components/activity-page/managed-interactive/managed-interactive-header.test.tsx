import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { ManagedInteractiveHeader } from "./managed-interactive-header";
import { DynamicTextTester } from "../../../test-utils/dynamic-text";

const hintPanelId = "hint-panel-314-ManagedInteractive";

const baseProps = {
  questionNumber: 1,
  questionName: "My question",
  hint: "<p>this is a hint</p>",
  showHint: false,
  hintPanelId,
  onToggleHint: jest.fn(),
  hideHeader: false,
};

const renderHeader = (props: Partial<typeof baseProps> = {}) => {
  const merged = { ...baseProps, ...props };
  const { container } = render(
    <DynamicTextTester>
      <ManagedInteractiveHeader {...merged} />
    </DynamicTextTester>
  );
  const trigger = container.querySelector<HTMLElement>("[data-cy='open-hint']");
  return { container, trigger };
};

describe("ManagedInteractiveHeader hint trigger", () => {
  it("renders the hint trigger as a native button element", () => {
    const { trigger } = renderHeader();
    expect(trigger).not.toBeNull();
    expect(trigger?.tagName).toBe("BUTTON");
  });

  it("gives the icon-only trigger an accessible name via aria-label", () => {
    const { trigger } = renderHeader();
    expect(trigger?.getAttribute("aria-label")).toBeTruthy();
  });

  it("reflects the collapsed state with aria-expanded='false'", () => {
    const { trigger } = renderHeader({ showHint: false });
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
  });

  it("reflects the expanded state with aria-expanded='true'", () => {
    const { trigger } = renderHeader({ showHint: true });
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
  });

  it("links the trigger to the hint panel with aria-controls", () => {
    const { trigger } = renderHeader();
    expect(trigger?.getAttribute("aria-controls")).toBe(hintPanelId);
  });

  it("calls onToggleHint when the trigger is activated", () => {
    const onToggleHint = jest.fn();
    const { trigger } = renderHeader({ onToggleHint });
    fireEvent.click(trigger!);
    expect(onToggleHint).toHaveBeenCalledTimes(1);
  });

  it("does not render a trigger when there is no hint", () => {
    const { trigger } = renderHeader({ hint: "" });
    expect(trigger).toBeNull();
  });
});
