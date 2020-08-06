import * as PluginAPI from "./index";

describe("Plugin API", () => {
  it("should export all the API functions", () => {
    expect(PluginAPI.registerPlugin).toBeDefined();
    // LARA_CODE expect(PluginAPI.addSidebar).toBeDefined();
    // LARA_CODE expect(PluginAPI.addPopup).toBeDefined();
    // LARA_CODE expect(PluginAPI.decorateContent).toBeDefined();
    // LARA_CODE expect(PluginAPI.events).toBeDefined();
  });
});
