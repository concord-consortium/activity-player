// import "./plugin-api/normalize.scss"; // TODO: uncomment when needed

import * as PluginAPI from "./plugin-api";
// import * as InteractiveAPI from "./interactive-api-parent"; // TODO: uncomment when needed
import * as Plugins from "./plugins";
// import * as Events from "./events"; // TODO: uncomment when needed
// import * as PageItemAuthoring from "./page-item-authoring"; // TODO: uncomment when needed

export {
  PluginAPI as PluginAPI_V3,
  // InteractiveAPI, // TODO: uncomment when needed
  Plugins,
  // Events, // TODO: uncomment when needed
  // PageItemAuthoring // TODO: uncomment when needed
};

export const createPluginNamespace = () => {
  // add empty LARA namespace to window
  (window as any).LARA = {};

  // Note that LARA namespace is defined for the first time by V2 API. Once V2 is removed, this code should also be
  // removed and "library": "LARA" option in webpack.config.js should be re-enabled.
  (window as any).LARA.PluginAPI_V3 = PluginAPI;
  (window as any).LARA.Plugins = Plugins;
  // (window as any).LARA.Events = Events; // TODO: uncomment when needed
  // (window as any).LARA.InteractiveAPI = InteractiveAPI; // TODO: uncomment when needed
  // (window as any).LARA.PageItemAuthoring = PageItemAuthoring; // TODO: uncomment when needed
};
