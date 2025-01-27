import React from "react";
import useResizeObserver from "@react-hook/resize-observer";

// cf. https://www.npmjs.com/package/@react-hook/resize-observer
export const useSize = (target: any) => {
  const [size, setSize] = React.useState();

  React.useLayoutEffect(() => {
    if (target.current) {
      setSize(target.current.getBoundingClientRect());
    }

    return () => {
      setSize(undefined);
    };
  }, [target]);

  useResizeObserver(target, (entry: any) => setSize(entry.contentRect));

  return size;
};