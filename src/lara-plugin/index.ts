// LARA_CODE import "./plugin-api/normalize.scss";

import * as PluginAPI from "./plugin-api";
// LARA_CODE import * as InteractiveAPI from "./interactive-api-parent";
import * as Plugins from "./plugins";
import * as Events from "./events";
// LARA_CODE import * as PageItemAuthoring from "./page-item-authoring";

export interface LaraGlobalType {
  PluginAPI_V3: typeof PluginAPI;
  Plugins: typeof Plugins;
  Events: typeof Events;
}

// export {
//   PluginAPI as PluginAPI_V3,
//   // LARA_CODE InteractiveAPI,
//   Plugins,
//   // LARA_CODE Events,
//   // LARA_CODE PageItemAuthoring
// };

export function initializeLara(): LaraGlobalType {
  const LARA: LaraGlobalType = {
    PluginAPI_V3: PluginAPI,
    Plugins,
    Events
  };
  // plugins require this global
  (window as any).LARA = LARA;
  return LARA;
}

// ACTIVITY_PLAYER_CODE: wrap namespace creation into function createPluginNamespace
// export const createPluginNamespace = () => {
//   // add empty LARA namespace to window
//   (window as any).LARA = {};

//   // Note that LARA namespace is defined for the first time by V2 API. Once V2 is removed, this code should also be
//   // removed and "library": "LARA" option in webpack.config.js should be re-enabled.
//   (window as any).LARA.PluginAPI_V3 = PluginAPI;
//   (window as any).LARA.Plugins = Plugins;
//   // LARA_CODE (window as any).LARA.Events = Events;
//   // LARA_CODE (window as any).LARA.InteractiveAPI = InteractiveAPI;
//   // LARA_CODE (window as any).LARA.PageItemAuthoring = PageItemAuthoring;
// };
