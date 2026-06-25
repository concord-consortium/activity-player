import { configure, render, screen } from "@testing-library/react";
import React from "react";
import { Logo } from "./logo";

describe("Logo component", () => {
  configure({ testIdAttribute: "data-cy" });

  const projectLogoUrl = "https://static.concord.org/projects/logos/ap/mw-logo.png";
  const projectUrl = "http://mw.concord.org/nextgen";

  // AP-86: the header logo is a semantic <a> link when it has a destination, so
  // assistive technology announces it as a link and it is keyboard-reachable.
  describe("semantic link markup (AP-86)", () => {
    it("renders the logo as a native anchor pointing at the project url", () => {
      render(<Logo logo={projectLogoUrl} url={projectUrl} title="Molecular Workbench" />);
      const link = screen.getByTestId("project-logo");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", projectUrl);
      expect(link).toHaveClass("project-logo");
      expect(link).not.toHaveClass("no-link");
    });

    it("opens the link in a new tab safely", () => {
      render(<Logo logo={projectLogoUrl} url={projectUrl} title="Molecular Workbench" />);
      const link = screen.getByTestId("project-logo");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link.getAttribute("rel")).toContain("noopener");
    });

    it("renders a non-link container when there is no destination url", () => {
      render(<Logo logo={undefined} url={undefined} />);
      const logo = screen.getByTestId("project-logo");
      expect(logo.tagName).not.toBe("A");
      expect(logo).not.toHaveAttribute("href");
      expect(logo).toHaveClass("no-link");
    });

    it("does not render a link for an unsafe url scheme", () => {
      // Author-supplied urls are only linked when http(s); a javascript: url
      // must not become an executable link.
      render(<Logo logo={projectLogoUrl} url={"javascript:alert(1)"} title="Evil" />);
      const logo = screen.getByTestId("project-logo");
      expect(logo.tagName).not.toBe("A");
      expect(logo).not.toHaveAttribute("href");
      expect(logo).toHaveClass("no-link");
    });
  });

  // AP-87: the logo image carries alt text that matches the visible logo.
  describe("logo image alt text (AP-87)", () => {
    it("uses the project title as the alt text of a project-supplied logo", () => {
      render(<Logo logo={projectLogoUrl} url={projectUrl} title="Molecular Workbench" />);
      const img = screen.getByTestId("logo-img");
      expect(img.tagName).toBe("IMG");
      expect(img).toHaveAttribute("src", projectLogoUrl);
      expect(img).toHaveAttribute("alt", "Molecular Workbench");
    });

    it("falls back to a destination-oriented alt when a project logo has no title", () => {
      // The alt is the link's accessible name, so it should describe the
      // destination rather than the image when no title is available. A
      // whitespace-only title is treated as empty.
      render(<Logo logo={projectLogoUrl} url={projectUrl} title="   " />);
      expect(screen.getByTestId("logo-img")).toHaveAttribute("alt", "Project website");
    });

    it("renders the default Concord logo as an img with a matching alt", () => {
      // No project logo, so the Concord Consortium logo is shown. Its alt must
      // describe the visible logo, not the project title.
      render(<Logo logo={undefined} url={projectUrl} title="Some Project" />);
      const img = screen.getByTestId("logo-img");
      expect(img.tagName).toBe("IMG");
      expect(img).toHaveAttribute("alt", "Concord Consortium");
    });
  });
});
