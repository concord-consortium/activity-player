import React from "react";
import { renderHook } from "@testing-library/react-hooks";
import { composeRefs, useCompositeRef } from "./use-composite-ref";

describe("composeRefs", () => {
  it("calls callback refs with the node", () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const composed = composeRefs<HTMLDivElement>(cb1, cb2);
    const node = document.createElement("div");

    composed(node);

    expect(cb1).toHaveBeenCalledWith(node);
    expect(cb2).toHaveBeenCalledWith(node);
  });

  it("sets MutableRefObject .current to the node", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();
    const composed = composeRefs<HTMLDivElement>(ref1, ref2);
    const node = document.createElement("div");

    composed(node);

    expect(ref1.current).toBe(node);
    expect(ref2.current).toBe(node);
  });

  it("handles a mix of callback refs and ref objects", () => {
    const cb = jest.fn();
    const ref = React.createRef<HTMLDivElement>();
    const composed = composeRefs<HTMLDivElement>(cb, ref);
    const node = document.createElement("div");

    composed(node);

    expect(cb).toHaveBeenCalledWith(node);
    expect(ref.current).toBe(node);
  });

  it("ignores undefined and null refs without throwing", () => {
    const cb = jest.fn();
    const composed = composeRefs<HTMLDivElement>(cb, undefined, null);
    const node = document.createElement("div");

    expect(() => composed(node)).not.toThrow();
    expect(cb).toHaveBeenCalledWith(node);
  });

  it("forwards null on unmount", () => {
    const cb = jest.fn();
    const ref = React.createRef<HTMLDivElement>();
    const composed = composeRefs<HTMLDivElement>(cb, ref);
    const node = document.createElement("div");

    composed(node);
    composed(null);

    expect(cb).toHaveBeenLastCalledWith(null);
    expect(ref.current).toBeNull();
  });
});

describe("useCompositeRef", () => {
  it("returns the same callback ref across renders when the refs are stable", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();
    const { result, rerender } = renderHook(() => useCompositeRef(ref1, ref2));

    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it("returns a new callback ref when a supplied ref's identity changes", () => {
    const ref1 = React.createRef<HTMLDivElement>();
    const ref2 = React.createRef<HTMLDivElement>();
    const ref3 = React.createRef<HTMLDivElement>();
    const { result, rerender } = renderHook(
      ({ r }) => useCompositeRef(ref1, r),
      { initialProps: { r: ref2 } },
    );

    const first = result.current;
    rerender({ r: ref3 });
    expect(result.current).not.toBe(first);
  });

  it("forwards the node to every supplied ref", () => {
    const cb = jest.fn();
    const ref = React.createRef<HTMLDivElement>();
    const { result } = renderHook(() => useCompositeRef(cb, ref));
    const node = document.createElement("div");

    result.current(node);

    expect(cb).toHaveBeenCalledWith(node);
    expect(ref.current).toBe(node);
  });
});
