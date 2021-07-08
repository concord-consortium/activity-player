import { act, configure, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { Logo } from "./logo";
import CCLogo from "../../assets/svg-icons/cclogo.svg";

describe("Logo component", () => {
  configure({ testIdAttribute: "data-cy" });

  const mockOpen = jest.fn();
  const windowOpen = window.open;

  beforeEach(() => {
    window.open = mockOpen;
    mockOpen.mockReset();
  });

  afterEach(() => {
    window.open = windowOpen;
  });

  it("renders logo when logo is specified", () => {
    render(<Logo logo={CCLogo} url={"https://concord.org/"} />);
    expect(screen.getByTestId("project-logo")).toHaveClass("project-logo");
    expect(screen.getByTestId("project-logo")).not.toHaveClass("no-link");
    expect(screen.getByTestId("logo-img")).toHaveClass("logo-img");

    act(() => {
      userEvent.click(screen.getByTestId("project-logo"));
    });
    expect(mockOpen).toHaveBeenCalled();

    mockOpen.mockReset();
    expect(mockOpen).not.toHaveBeenCalled();

    act(() => {
      userEvent.keyboard("{enter}");
    });
    expect(mockOpen).toHaveBeenCalled();
  });

  it("renders default logo when no logo is specified", () => {
    render(<Logo logo={undefined} url={undefined} />);
    expect(screen.getByTestId("project-logo")).toHaveClass("project-logo");
    expect(screen.getByTestId("project-logo")).toHaveClass("no-link");
    expect(screen.queryByTestId("logo-img")).toBeNull();
  });
});
