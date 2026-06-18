import React from "react";
import { render } from "@testing-library/react";
import { OverrideBanner } from "./override-banner";
import { OverrideInfo } from "../utilities/url-overrides/types";

const emptyInfo: OverrideInfo = { active: [], errors: [], registryFetchFailed: false };

const mkRule = (key: string, param: string | undefined, value: string) => ({
  key,
  param,
  value,
  regex: /x/,
  replacement: "",
  scanAuthoredState: false,
});

describe("OverrideBanner", () => {
  it("renders nothing when there are no active overrides and no errors", () => {
    const { container } = render(<OverrideBanner info={emptyInfo} />);
    expect(container.firstChild).toBeNull();
  });

  it("lists each active override", () => {
    const info: OverrideInfo = {
      active: [mkRule("qi", undefined, "toolbar-accessibility"), mkRule("mr", "tectonic-explorer", "fix")],
      errors: [],
      registryFetchFailed: false,
    };
    const { getByText } = render(<OverrideBanner info={info} />);
    expect(getByText(/override\.qi\s*=\s*toolbar-accessibility/)).toBeInTheDocument();
    expect(getByText(/override\.mr\.tectonic-explorer\s*=\s*fix/)).toBeInTheDocument();
  });

  it("shows a registry-fetch-failed message", () => {
    const info: OverrideInfo = { active: [], errors: [], registryFetchFailed: true };
    const { getByText } = render(<OverrideBanner info={info} />);
    expect(getByText(/registry.*not.*loaded/i)).toBeInTheDocument();
  });

  it("shows compile errors", () => {
    const info: OverrideInfo = {
      active: [],
      errors: [{ key: "nope", reason: "Unknown override key: nope" }],
      registryFetchFailed: false,
    };
    const { getByText } = render(<OverrideBanner info={info} />);
    expect(getByText(/Unknown override key: nope/)).toBeInTheDocument();
  });
});
