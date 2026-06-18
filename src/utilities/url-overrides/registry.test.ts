import { fetchRegistry, REGISTRY_URL } from "./registry";

describe("fetchRegistry", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("uses the hardcoded registry URL", () => {
    expect(REGISTRY_URL).toBe(
      "https://models-resources.concord.org/runtime-config/interactive-override-registry.json"
    );
  });

  it("returns the parsed JSON on success", async () => {
    const body = {
      qi: { prefix: "https://x/", match: "y", replace: "z" },
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
    }) as any;
    const result = await fetchRegistry();
    expect(global.fetch).toHaveBeenCalledWith(REGISTRY_URL, expect.objectContaining({ cache: "no-cache" }));
    expect(result).toEqual(body);
  });

  it("rejects when the response is not ok", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    await expect(fetchRegistry()).rejects.toThrow(/404/);
  });

  it("rejects when the body is not valid JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => { throw new SyntaxError("Unexpected token"); },
    }) as any;
    await expect(fetchRegistry()).rejects.toThrow();
  });

  it("rejects when the parsed body is not an object", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ["not", "an", "object"],
    }) as any;
    await expect(fetchRegistry()).rejects.toThrow(/object/i);
  });
});
