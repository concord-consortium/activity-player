import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { ManagedInteractiveHint } from "./managed-interactive-hint";
import { DynamicTextTester } from "../../../test-utils/dynamic-text";

const panelId = "hint-panel-314-ManagedInteractive";

const renderHint = (props: Partial<React.ComponentProps<typeof ManagedInteractiveHint>> = {}) => {
  const { container } = render(
    <DynamicTextTester>
      <ManagedInteractiveHint
        hint="<p>this is a hint</p>"
        showHint={true}
        panelId={panelId}
        onToggleHint={jest.fn()}
        {...props}
      />
    </DynamicTextTester>
  );
  return { container };
};

describe("ManagedInteractiveHint panel", () => {
  it("gives the panel the provided id so the trigger's aria-controls can reference it", () => {
    const { container } = renderHint();
    const panel = container.querySelector(`#${panelId}`);
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains("hint-container")).toBe(true);
  });
});

describe("ManagedInteractiveHint close control", () => {
  it("renders the close control as a native button element", () => {
    const { container } = renderHint();
    const close = container.querySelector("[data-cy='close-hint']");
    expect(close).not.toBeNull();
    expect(close?.tagName).toBe("BUTTON");
  });

  it("gives the close button an accessible name via aria-label", () => {
    const { container } = renderHint();
    const close = container.querySelector("[data-cy='close-hint']");
    expect(close?.getAttribute("aria-label")).toBeTruthy();
  });

  it("calls onToggleHint when the close button is activated", () => {
    const onToggleHint = jest.fn();
    const { container } = renderHint({ onToggleHint });
    const close = container.querySelector<HTMLElement>("[data-cy='close-hint']");
    fireEvent.click(close!);
    expect(onToggleHint).toHaveBeenCalledTimes(1);
  });
});
