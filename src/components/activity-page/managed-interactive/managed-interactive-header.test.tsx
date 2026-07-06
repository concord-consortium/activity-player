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

  it("gives the trigger a stable, question-contextual accessible name", () => {
    // The name stays stable across open/closed state; aria-expanded conveys state.
    const collapsed = renderHeader({ showHint: false }).trigger;
    expect(collapsed?.getAttribute("aria-label")).toBe("Hint for My question");
    const expanded = renderHeader({ showHint: true }).trigger;
    expect(expanded?.getAttribute("aria-label")).toBe("Hint for My question");
  });

  it("falls back to a generic hint label when there is no question name", () => {
    const { trigger } = renderHeader({ questionName: "" });
    expect(trigger?.getAttribute("aria-label")).toBe("Show hint");
  });

  it("trims surrounding whitespace from the question name in the accessible name", () => {
    const { trigger } = renderHeader({ questionName: "  My question  " });
    expect(trigger?.getAttribute("aria-label")).toBe("Hint for My question");
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

  it("hides the decorative question icon from assistive technology", () => {
    const { trigger } = renderHeader();
    const icon = trigger?.querySelector("[aria-hidden='true']");
    expect(icon).not.toBeNull();
  });

  it("does not render a trigger when there is no hint", () => {
    const { trigger } = renderHeader({ hint: "" });
    expect(trigger).toBeNull();
  });
});

describe("ManagedInteractiveHeader heading semantics", () => {
  it("renders the question title as an h2 heading", () => {
    const { container } = renderHeader();
    const heading = container.querySelector("h2.embeddable-header-text");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain("Question #1: My question");
  });

  it("uses the interactive name (with no number) as the heading when question numbers are hidden", () => {
    const { container } = renderHeader({ questionNumber: undefined, questionName: "Drawing Tool Name" });
    const heading = container.querySelector("h2.embeddable-header-text");
    expect(heading).not.toBeNull();
    expect(heading?.textContent).toContain("Drawing Tool Name");
    expect(heading?.textContent).not.toContain("Question #");
  });

  it("renders no heading element when the header exists only for a hint", () => {
    // Hidden question number + no name, but a hint is present: the header bar must
    // still render for the hint trigger, but must NOT introduce an empty heading.
    const { container, trigger } = renderHeader({ questionNumber: undefined, questionName: "" });
    expect(container.querySelector("h2")).toBeNull();
    expect(container.querySelector(".header")).not.toBeNull();
    expect(trigger).not.toBeNull();
  });
});
