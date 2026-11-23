import React, { useEffect, useState } from "react";

interface IProps {
  root: HTMLElement | null;
}

interface ISize {
  width: number;
  height: number;
}

const findIframe = (root: HTMLElement | null) =>
  root?.querySelector<HTMLIFrameElement>(".iframe-runtime iframe") ?? null;

// Shows the interactive iframe's live size and the window's size, fixed to a corner so it never
// changes the layout being measured.
export const SizeReadout = ({ root }: IProps) => {
  const [iframeSize, setIframeSize] = useState<ISize | null>(null);
  const [windowSize, setWindowSize] = useState<ISize>({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    if (!root) return;

    let iframe: HTMLIFrameElement | null = null;
    const resizeObserver = new ResizeObserver(() => measure());

    function measure() {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      if (iframe) {
        const { width, height } = iframe.getBoundingClientRect();
        setIframeSize({ width, height });
      } else {
        setIframeSize(null);
      }
    }

    // Re-render can replace the iframe element, so look it up again whenever root's content changes.
    function follow() {
      const current = findIframe(root);
      if (current !== iframe) {
        if (iframe) resizeObserver.unobserve(iframe);
        iframe = current;
        if (iframe) resizeObserver.observe(iframe);
      }
      measure();
    }

    const mutationObserver = new MutationObserver(follow);
    mutationObserver.observe(root, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    follow();

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [root]);

  return (
    <div className="size-readout">
      <div>
        <span className="size-readout-label">Iframe</span>{" "}
        <span data-testid="readout-iframe">
          {iframeSize ? `${iframeSize.width.toFixed(1)} × ${iframeSize.height.toFixed(1)}` : "none"}
        </span>
      </div>
      <div>
        <span className="size-readout-label">Window</span>{" "}
        <span data-testid="readout-window">{`${windowSize.width} × ${windowSize.height}`}</span>
      </div>
    </div>
  );
};
