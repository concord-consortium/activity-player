import { act, renderHook } from "@testing-library/react-hooks";
import { useHashSettings } from "./use-hash-settings";

const changeHash = (hash: string) => {
  act(() => {
    window.history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
};

describe("useHashSettings", () => {
  beforeEach(() => window.history.replaceState(null, "", "#layout=full-width"));

  it("updates when the hash changes a setting that formatSettings leaves out", () => {
    const { result } = renderHook(() => useHashSettings());
    expect(result.current[0].nativeWidth).toBe(576);
    changeHash("#layout=full-width&native_width=800&native_height=300");
    expect(result.current[0].nativeWidth).toBe(800);
    expect(result.current[0].nativeHeight).toBe(300);
    changeHash("#layout=full-width&other_text=short&column=secondary");
    expect(result.current[0].otherText).toBe("short");
    expect(result.current[0].column).toBe("secondary");
  });

  it("keeps the same settings object when the hash holds the same values", () => {
    const { result } = renderHook(() => useHashSettings());
    const before = result.current[0];
    changeHash("#layout=full-width");
    expect(result.current[0]).toBe(before);
  });
});
