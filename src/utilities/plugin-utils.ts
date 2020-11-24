import { ICustomMessage } from "@concord-consortium/lara-interactive-api";
import { Optional } from "utility-types";
import { LaraGlobalType } from "../lara-plugin";
import { IEmbeddableContextOptions, IPluginRuntimeContextOptions } from "../lara-plugin/plugins/plugin-context";
import { Activity, Embeddable, IEmbeddablePlugin } from "../types";

type PluginType = "TeacherEdition" | "Glossary";
export interface PluginInfo {
  url: string;
  type: PluginType,
  name: string;
  id: number;
  loaded: boolean;
}

// TODO: this information should come from the activity JSON
export const Plugins: PluginInfo[] = [
  {
    url: "https://teacher-edition-tips-plugin.concord.org/version/v3.5.6/plugin.js",
    type: "TeacherEdition",
    name: "Teacher Edition",
    id: 0,
    loaded: false
  },
];

export const loadPluginScripts = (LARA: LaraGlobalType, activity: Activity, handleLoadPlugins: () => void) => {
  // load any plugin scripts, each should call registerPlugin if correctly loaded
  const usedPlugins: PluginInfo[] = [];
  for (let page = 0; page < activity.pages.length - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddable = activity.pages[page].embeddables[embeddableNum].embeddable;
        if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.approved_script_label === "teacherEditionTips") {
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
    LARA.Plugins.setNextPluginLabel(pluginLabel);
    // load the script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = plugin.url;
    document.body.appendChild(script);
    script.onload = function() {
      plugin.loaded = true;
      if (usedPlugins.filter((p) => !p.loaded).length === 0) {
        handleLoadPlugins();
      }
    };
  });
};

export interface IEmbeddablePluginContext {
  LARA: LaraGlobalType;
  embeddable: IEmbeddablePlugin;
  embeddableContainer: HTMLElement;
  wrappedEmbeddable?: Embeddable;
  wrappedEmbeddableContainer?: HTMLElement;
  sendCustomMessage?: (message: ICustomMessage) => void;
}
export type IPartialEmbeddablePluginContext = Partial<IEmbeddablePluginContext>;

export const validateEmbeddablePluginContextForPlugin =
              (context: IPartialEmbeddablePluginContext): IEmbeddablePluginContext | undefined => {
  const { LARA, embeddable, embeddableContainer, ...others } = context;
  return LARA && embeddable && embeddableContainer
          ? { LARA, embeddable, embeddableContainer, ...others }
          : undefined;
};

export const validateEmbeddablePluginContextForWrappedEmbeddable =
              (context: IPartialEmbeddablePluginContext): IEmbeddablePluginContext | undefined => {
  const { wrappedEmbeddable, wrappedEmbeddableContainer } = context;
  const validated = validateEmbeddablePluginContextForPlugin(context);
  return validated && wrappedEmbeddable && wrappedEmbeddableContainer ? validated : undefined;
};

export const initializePlugin = (context: IEmbeddablePluginContext) => {
  const { LARA, embeddable, embeddableContainer,
          wrappedEmbeddable, wrappedEmbeddableContainer, sendCustomMessage } = context;
  // TODO: will need to change search as we implement other plugin types
  const plugin = Plugins.find(p => p.type === "TeacherEdition");
  if (!plugin) return;

  const embeddableContext: Optional<IEmbeddableContextOptions, "container"> = {
    container: wrappedEmbeddableContainer,
    laraJson: wrappedEmbeddable,
    interactiveStateUrl: null,
    interactiveAvailable: true,
    sendCustomMessage
  };
  // cast to any for usage below
  const embeddableContextAny = embeddableContext as any;

  const pluginId = plugin.id;
  const pluginLabel = `plugin${pluginId}`;
  const pluginContext: IPluginRuntimeContextOptions = {
    type: "runtime",
    name: plugin?.name || "",
    url: plugin?.url || "",
    pluginId,
    embeddablePluginId: null,
    authoredState: embeddable.plugin?.author_data || null,
    learnerState: null,
    learnerStateSaveUrl: "",
    container: embeddableContainer,
    componentLabel: pluginLabel,
    runId: 0,
    remoteEndpoint: null,
    userEmail: null,
    classInfoUrl: null,
    firebaseJwtUrl: "",
    wrappedEmbeddable: wrappedEmbeddable ? embeddableContextAny : null,
    resourceUrl: ""
  };
  // TODO: add sophistication to handle other types
  LARA.Plugins.initPlugin(pluginLabel, pluginContext);
};
