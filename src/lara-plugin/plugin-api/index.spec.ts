// ACTIVITY_PLAYER_CODE:
import $ from "jquery";
(window as any).jQuery = $;
(window as any).$ = $;
import "jquery-ui";

import * as PluginAPI from "./index";

describe("Plugin API", () => {
  it("should export all the API functions", () => {
    expect(PluginAPI.registerPlugin).toBeDefined();
    expect(PluginAPI.addSidebar).toBeDefined();
    expect(PluginAPI.addPopup).toBeDefined();
    expect(PluginAPI.decorateContent).toBeDefined();
    // LARA_CODE expect(PluginAPI.events).toBeDefined();
  });
});
