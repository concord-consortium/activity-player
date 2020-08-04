// import "./plugin-api/normalize.scss";
import { Activity } from "../types";

import * as PluginAPI from "./plugin-api";
// import * as InteractiveAPI from "./interactive-api-parent";
import * as Plugins from "./plugins";
// import * as Events from "./events";
// import * as PageItemAuthoring from "./page-item-authoring";

export {
  PluginAPI as PluginAPI_V3,
  // InteractiveAPI,
  Plugins,
  // Events,
  // PageItemAuthoring
};

// add empty LARA namespace to window
(window as any).LARA = {};

// Note that LARA namespace is defined for the first time by V2 API. Once V2 is removed, this code should also be
// removed and "library": "LARA" option in webpack.config.js should be re-enabled.
(window as any).LARA.PluginAPI_V3 = PluginAPI;
(window as any).LARA.Plugins = Plugins;
// (window as any).LARA.Events = Events;
// (window as any).LARA.InteractiveAPI = InteractiveAPI;
// (window as any).LARA.PageItemAuthoring = PageItemAuthoring;

export const loadPluginScripts = (activity: Activity) => {
  // load any plugin scripts, each should call registerPlugin if correctly loaded
  // TODO: this URL should come from the activity JSON
  const teacherEditionPluginURL = "https://teacher-edition-tips-plugin.concord.org/version/v3.5.6/plugin.js";
  const pluginScripts: string[] = [];
  for (let page = 0; page < activity.pages.length - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddable = activity.pages[page].embeddables[embeddableNum].embeddable;
        if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.component_label === "windowShade") {
          if (pluginScripts.indexOf(teacherEditionPluginURL) === -1) {
            pluginScripts.push(teacherEditionPluginURL);
          }
        }
      }
    }
  }

  pluginScripts.forEach((pluginScript: string) => {
    // set plugin label
    (window as any).LARA.Plugins.setNextPluginLabel("#{v3_plugin_label}");
    // load the script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = pluginScript;
    document.body.appendChild(script);
    script.onload = function() {
      // console.log("plugin script loaded");
    };
  });
};

export const initializePlugin = (container: HTMLElement, authoredData: string) => {
  const pluginContext = {
    name: "plugin name",
    url: "plugin url",
    pluginId: "plugin id",
    embeddablePluginId: null,
    authoredState: authoredData,
    learnerState: null,
    learnerStateSaveUrl: "",
    container: container,
    runId: "run id",
    remoteEndpoint: null,
    userEmail: null,
    classInfoUrl: null,
    firebaseJwtUrl: "",
    wrappedEmbeddable: null,
    resourceUrl: "",
  };
  // console.log("Adding #{plugin.name} runtime plugin as #{v3_plugin_label} with V3 LARA Plugin API");
  (window as any).LARA.Plugins.initPlugin("#{v3_plugin_label}", pluginContext);
};
