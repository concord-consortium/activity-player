import { MutableRefObject, Ref, useMemo } from "react";

/**
 * Merge several React refs (callback refs and/or MutableRefObjects) into one
 * callback ref. Each supplied ref receives the node on mount and `null` on
 * unmount. `undefined`/`null` entries are ignored — convenient for optional
 * external refs threaded through component props.
 *
 * Prefer `useCompositeRef` inside components: an inline `composeRefs(...)` call
 * returns a new callback ref every render, which React treats as a ref change
 * (detaching the node with `null`, then reattaching it). `useCompositeRef`
 * memoizes the result so the ref stays stable across renders.
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

/**
 * Hook form of `composeRefs` that returns a stable, memoized callback ref.
 * The composed ref only changes when one of the supplied refs changes, so the
 * merged node is not needlessly detached/reattached on every render.
 */
export function useCompositeRef<T>(
  ...refs: Array<Ref<T> | undefined | null>
): (node: T | null) => void {
  // refs is a fresh array each render, but useMemo compares its entries, and
  // those entries are stable ref identities. eslint can't statically verify a
  // spread dependency list, so the rule is disabled here intentionally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => composeRefs(...refs), refs);
}
