import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DraftInput } from "./draft-input";

const props = {
  label: "Width",
  isValid: (draft: string) => /^\d+$/.test(draft),
  invalidMessage: "Enter a whole number",
};

const typeAndBlur = (field: HTMLElement, text: string) => {
  userEvent.clear(field);
  userEvent.type(field, text);
  fireEvent.blur(field);
};

describe("DraftInput", () => {
  it("follows a value applied from elsewhere, and drops its error", () => {
    const { rerender } = render(<DraftInput {...props} value="576" onCommit={jest.fn()} />);
    const field = screen.getByRole("textbox", { name: "Width" });
    typeAndBlur(field, "x");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(<DraftInput {...props} value="800" onCommit={jest.fn()} />);
    expect(field).toHaveValue("800");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ties its error to the field", () => {
    render(<DraftInput {...props} value="576" onCommit={jest.fn()} />);
    const field = screen.getByRole("textbox", { name: "Width" });
    expect(field).toHaveAttribute("aria-invalid", "false");
    expect(field).not.toHaveAccessibleDescription();

    typeAndBlur(field, "x");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(field).toHaveAccessibleDescription("Enter a whole number");
  });

  it("clears its error, and applies nothing, when the applied value is typed back", () => {
    const onCommit = jest.fn();
    render(<DraftInput {...props} value="576" onCommit={onCommit} />);
    const field = screen.getByRole("textbox", { name: "Width" });
    typeAndBlur(field, "x");

    typeAndBlur(field, "576");
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(field).toHaveAttribute("aria-invalid", "false");
  });
});
