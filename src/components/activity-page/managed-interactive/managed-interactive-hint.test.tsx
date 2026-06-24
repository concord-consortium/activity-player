import { render } from "@testing-library/react";
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

  it("preserves the panel id even when showHint is false so aria-controls stays valid", () => {
    const { container } = renderHint({ showHint: false });
    const panel = container.querySelector(`#${panelId}`);
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains("collapsed")).toBe(true);
  });
});
