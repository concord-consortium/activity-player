import React from "react";
import { Lightbox } from "./lightbox";
import { fireEvent, render } from "@testing-library/react";

describe("Lightbox component", () => {
  it("renders an image lightbox with a close button", () => {
    const imageUrl = "https://concord.org/test.png";
    const stubOnClose = jest.fn();
    const { getByTestId } = render(
      <Lightbox type="lightbox" onClose={stubOnClose} isImage={true} url={imageUrl} allowUpscale={true} />
    );
    const image = getByTestId("lightbox-image");
    expect(image).toBeDefined();
    expect(image).toHaveAttribute("src", imageUrl);
    const closeButton = getByTestId("lightbox-close");
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);
    expect(stubOnClose).toHaveBeenCalledTimes(1);
  });
  it("renders an iframe lightbox with a close button", () => {
    const iframeUrl = "https://concord.org/test.html";
    const stubOnClose = jest.fn();
    const { getByTestId } = render(
      <Lightbox type="lightbox" onClose={stubOnClose} isImage={false} url={iframeUrl} allowUpscale={false} />
    );
    const iframe = getByTestId("lightbox-iframe");
    expect(iframe).toBeDefined();
    expect(iframe).toHaveAttribute("src", iframeUrl);
    const closeButton = getByTestId("lightbox-close");
    expect(closeButton).toBeDefined();
    fireEvent.click(closeButton);
    expect(stubOnClose).toHaveBeenCalledTimes(1);
  });
});
