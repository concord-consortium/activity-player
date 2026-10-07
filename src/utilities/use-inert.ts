import { RefObject, useEffect } from "react";

/** Sets the `inert` attribute on the referenced element while `active`; React 16 does not know the `inert` prop. */
export const useInert = (ref: RefObject<HTMLElement>, active: boolean) => {
  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;
    element.setAttribute("inert", "");
    return () => element.removeAttribute("inert");
  }, [ref, active]);
};
