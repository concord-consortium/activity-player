import { Activity } from "../types";

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
      // TODO: might need additional handling here
      // console.log("plugin script loaded");
    };
  });
};

export const initializePlugin = (container: HTMLElement, authoredData: string) => {
  // TODO: will need additions based as we implement other plugin types
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
  (window as any).LARA.Plugins.initPlugin("#{v3_plugin_label}", pluginContext);
};
