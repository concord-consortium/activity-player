import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ControlsPanel } from "./controls-panel";
import { ISizingSettings, kDefaultSettings } from "./settings";

const renderPanel = (overrides: Partial<ISizingSettings> = {}) => {
  const onChange = jest.fn();
  const settings = { ...kDefaultSettings, ...overrides };
  render(<ControlsPanel settings={settings} onChange={onChange} />);
  return { onChange, settings };
};

describe("ControlsPanel", () => {
  it("changes the layout and leaves the other settings alone", () => {
    const { onChange, settings } = renderPanel();
    userEvent.selectOptions(screen.getByRole("combobox", { name: "Layout" }), "60-40 (primary on left)");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...settings, layout: "60-40" });
  });

  // Each option is picked by the label a designer sees, so a label on the wrong value fails too.
  it.each([
    ["Activity Page Fixed Width", "iPad Friendly (960px)", {}, { fixedWidthLayout: "ipad_friendly" }],
    ["Interactive kind", "Basic iframe interactive", {}, { kind: "mw" }],
    ["Interactive kind", "Library interactive, customized", {}, { kind: "library-custom" }],
    ["Aspect Ratio", "Use all available space for the interactive", {}, { aspectRatioMethod: "MAX" }],
    ["Interactive's column", "Secondary", { layout: "60-40" }, { column: "secondary" }],
    ["Other column's text", "A short paragraph", { layout: "60-40" }, { otherText: "short" }],
  ] as const)("changes %s to %s", (name, option, start, change) => {
    const { onChange, settings } = renderPanel(start as Partial<ISizingSettings>);
    userEvent.selectOptions(screen.getByRole("combobox", { name }), option);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ ...settings, ...change });
  });

  it("turns off Has a name", () => {
    const { onChange, settings } = renderPanel();
    userEvent.click(screen.getByRole("checkbox", { name: "Has a name" }));
    expect(onChange).toHaveBeenCalledWith({ ...settings, named: false });
  });

  it("shows the column and other-text controls only for a two-column layout", () => {
    const { unmount } = render(<ControlsPanel settings={kDefaultSettings} onChange={jest.fn()} />);
    expect(screen.queryByRole("combobox", { name: "Interactive's column" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Other column's text" })).toBeNull();
    unmount();
    renderPanel({ layout: "60-40" });
    expect(screen.getByRole("combobox", { name: "Interactive's column" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Other column's text" })).toBeInTheDocument();
  });

  it("shows Width and Height only for MANUAL", () => {
    const { unmount } = render(<ControlsPanel settings={kDefaultSettings} onChange={jest.fn()} />);
    expect(screen.queryByRole("textbox", { name: "Width" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Height" })).toBeNull();
    unmount();
    renderPanel({ aspectRatioMethod: "MANUAL" });
    expect(screen.getByRole("textbox", { name: "Width" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Height" })).toBeInTheDocument();
  });

  it("disables the fixed width for a responsive layout and says why", () => {
    renderPanel({ layout: "responsive-30-70" });
    expect(screen.getByRole("combobox", { name: "Activity Page Fixed Width" })).toBeDisabled();
    expect(screen.getByText("Not used: a responsive section makes the page full width")).toBeInTheDocument();
  });

  it("enables the fixed width for a layout that isn't responsive", () => {
    renderPanel({ layout: "60-40" });
    expect(screen.getByRole("combobox", { name: "Activity Page Fixed Width" })).toBeEnabled();
    expect(screen.queryByText(/Not used/)).toBeNull();
  });

  describe("a native size", () => {
    it("is applied on blur, not while typing", () => {
      const { onChange, settings } = renderPanel({ aspectRatioMethod: "MANUAL" });
      const width = screen.getByRole("textbox", { name: "Width" });
      userEvent.clear(width);
      userEvent.type(width, "800");
      expect(onChange).not.toHaveBeenCalled();
      fireEvent.blur(width);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ ...settings, nativeWidth: 800 });
    });

    it("is applied without the spaces around it", () => {
      const { onChange, settings } = renderPanel({ aspectRatioMethod: "MANUAL" });
      const width = screen.getByRole("textbox", { name: "Width" });
      userEvent.clear(width);
      userEvent.type(width, " 800 ");
      fireEvent.blur(width);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ ...settings, nativeWidth: 800 });
    });

    it("is applied on Enter", () => {
      const { onChange, settings } = renderPanel({ aspectRatioMethod: "MANUAL" });
      const height = screen.getByRole("textbox", { name: "Height" });
      userEvent.clear(height);
      userEvent.type(height, "300{enter}");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ ...settings, nativeHeight: 300 });
    });

    it("isn't applied when it isn't a positive whole number", () => {
      const { onChange } = renderPanel({ aspectRatioMethod: "MANUAL" });
      const width = screen.getByRole("textbox", { name: "Width" });
      userEvent.clear(width);
      userEvent.type(width, "-5");
      fireEvent.blur(width);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("whole number");
    });
  });

  describe("the interactive URL", () => {
    it("shows a message and keeps the last URL when it isn't an absolute http(s) URL", () => {
      const { onChange } = renderPanel();
      const url = screen.getByRole("textbox", { name: "Interactive URL" });
      userEvent.clear(url);
      userEvent.type(url, "example.com/x");
      fireEvent.blur(url);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("absolute http");
    });

    it("is applied on Enter when it is valid", () => {
      const { onChange, settings } = renderPanel();
      const url = screen.getByRole("textbox", { name: "Interactive URL" });
      userEvent.clear(url);
      userEvent.type(url, "https://example.com/x{enter}");
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ ...settings, interactive: "https://example.com/x" });
    });
  });

  it("applies a URL without the spaces around it", () => {
    const { onChange, settings } = renderPanel();
    const url = screen.getByRole("textbox", { name: "Interactive URL" });
    userEvent.clear(url);
    userEvent.type(url, " https://example.com/x ");
    fireEvent.blur(url);
    expect(onChange).toHaveBeenCalledWith({ ...settings, interactive: "https://example.com/x" });
  });

  it("turns on the Clear & start over button", () => {
    const { onChange, settings } = renderPanel();
    userEvent.click(screen.getByRole("checkbox", { name: "Show \"Clear & start over\" button" }));
    expect(onChange).toHaveBeenCalledWith({ ...settings, clearButton: true });
  });
});
