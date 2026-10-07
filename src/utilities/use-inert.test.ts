import { renderHook } from "@testing-library/react-hooks";
import { useInert } from "./use-inert";

describe("useInert", () => {
  const renderInert = (active: boolean) => {
    const element = document.createElement("div");
    const ref = { current: element };
    const hook = renderHook(({ isActive }) => useInert(ref, isActive), { initialProps: { isActive: active } });
    return { element, hook };
  };

  it("sets inert while active", () => {
    const { element } = renderInert(true);
    expect(element.hasAttribute("inert")).toBe(true);
  });

  it("leaves the element alone while inactive", () => {
    const { element } = renderInert(false);
    expect(element.hasAttribute("inert")).toBe(false);
  });

  it("removes inert when it turns inactive", () => {
    const { element, hook } = renderInert(true);
    hook.rerender({ isActive: false });
    expect(element.hasAttribute("inert")).toBe(false);
  });

  it("removes inert on unmount", () => {
    const { element, hook } = renderInert(true);
    hook.unmount();
    expect(element.hasAttribute("inert")).toBe(false);
  });
});
