import { MutableRefObject, Ref } from "react";

/**
 * Merge several React refs (callback refs and/or MutableRefObjects) into one
 * callback ref. Each supplied ref receives the node on mount and `null` on
 * unmount. `undefined`/`null` entries are ignored — convenient for optional
 * external refs threaded through component props.
 */
export function composeRefs<T>(
  ...refs: Array<Ref<T> | undefined | null>
): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        (ref as MutableRefObject<T | null>).current = node;
      }
    }
  };
}
