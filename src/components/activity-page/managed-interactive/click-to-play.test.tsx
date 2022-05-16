import React from "react";
import { configure, fireEvent, render, screen } from "@testing-library/react";
import { ClickToPlay } from "./click-to-play";

configure({ testIdAttribute: "data-cy" });

describe("ClickToPlay component", () => {

  it("renders component with onClick handler and default props", () => {
    const mockOnClick = jest.fn();
    render(<ClickToPlay onClick={mockOnClick} />);
    const el = screen.getByTestId("click-to-play");

    expect(el).toBeInTheDocument();
    expect(el.outerHTML).toBe(`<div class="click-to-play" data-cy="click-to-play"><div>Click here to start the interactive.</div></div>`);

    expect(mockOnClick).not.toHaveBeenCalled();
    fireEvent.click(el);
    expect(mockOnClick).toHaveBeenCalled();
  });

  it("renders component with onClick handler and props", () => {
    const mockOnClick = jest.fn();
    render(<ClickToPlay prompt="Test Prompt" imageUrl="http://example.com/test.png" onClick={mockOnClick} />);
    const el = screen.getByTestId("click-to-play");

    expect(el).toBeInTheDocument();
    expect(el.outerHTML).toBe(`<div class="click-to-play" data-cy="click-to-play"><img src="http://example.com/test.png"><div>Test Prompt</div></div>`);
  });

});
