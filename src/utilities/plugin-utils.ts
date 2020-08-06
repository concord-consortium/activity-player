import { Activity } from "../types";

type PluginType = "TeacherEdition" | "Glossary";
export interface PluginInfo {
  url: string;
  type: PluginType,
  name: string;
  id: number;
}

// TODO: this information should come from the activity JSON
export const Plugins: PluginInfo[] = [
  {
    url: "https://teacher-edition-tips-plugin.concord.org/version/v3.5.6/plugin.js",
    type: "TeacherEdition",
    name: "teacher edition plugin",
    id: 0
  },
];

export const loadPluginScripts = (activity: Activity) => {
  // load any plugin scripts, each should call registerPlugin if correctly loaded
  const usedPlugins: PluginInfo[] = [];
  for (let page = 0; page < activity.pages.length - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddable = activity.pages[page].embeddables[embeddableNum].embeddable;
        if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.component_label === "windowShade") {
          const plugin = Plugins.find(p => p.type === "TeacherEdition");
          if (plugin && !usedPlugins.some(p => p.type === "TeacherEdition")) {
            usedPlugins.push(plugin);
          }
        }
      }
    }
  }

  usedPlugins.forEach((plugin) => {
    // set plugin label
    const pluginLabel = "plugin" + plugin.id;
    (window as any).LARA.Plugins.setNextPluginLabel(pluginLabel);
    // load the script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = plugin.url;
    document.body.appendChild(script);
    script.onload = function() {
      // TODO: might need additional handling here
      // console.log("plugin script loaded");
    };
  });
};

export const initializePlugin = (container: HTMLElement, authoredData: string) => {
  // TODO: will need additions based as we implement other plugin types
  const plugin = Plugins.find(p => p.type === "TeacherEdition");
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
  // TODO: add sophistication to handle other types
  const pluginLabel = "plugin" + plugin?.id;
  (window as any).LARA.Plugins.initPlugin(pluginLabel, pluginContext);
};
