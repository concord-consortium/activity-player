import { ICustomMessage } from "@concord-consortium/lara-interactive-api";
import { Optional } from "utility-types";
import { LaraGlobalType } from "../lara-plugin";
import { IEmbeddableContextOptions, IPluginRuntimeContextOptions } from "../lara-plugin/plugins/plugin-context";
import { Activity, Embeddable, IEmbeddablePlugin, Plugin } from "../types";

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
  {
    url: "https://glossary-plugin.concord.org/version/v3.10.0/plugin.js",
    type: "Glossary",
    name: "Glossary",
    id: 1,
    loaded: false
  },
];

export const loadPluginScripts = (LARA: LaraGlobalType, activity: Activity, handleLoadPlugins: () => void, teacherEditionMode: boolean) => {
  // load any plugin scripts, each should call registerPlugin if correctly loaded
  const usedPlugins: PluginInfo[] = [];
  // search each page for teacher edition plugin use
  for (let page = 0; page < activity.pages.length - 1; page++) {
    if (!activity.pages[page].is_hidden) {
      for (let embeddableNum = 0; embeddableNum < activity.pages[page].embeddables.length; embeddableNum++) {
        const embeddable = activity.pages[page].embeddables[embeddableNum].embeddable;
        if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.approved_script_label === "teacherEditionTips" && teacherEditionMode) {
          const plugin = Plugins.find(p => p.type === "TeacherEdition");
          if (plugin && !usedPlugins.some(p => p.type === "TeacherEdition")) {
            usedPlugins.push(plugin);
          }
        }
      }
    }
  }
  // search plugin array for glossary plugin use
  activity.plugins.forEach((activityPlugin: Plugin) => {
    if (activityPlugin.approved_script_label === "glossary") {
      const plugin = Plugins.find(p => p.type === "Glossary");
      if (plugin && !usedPlugins.some(p => p.type === "Glossary")) {
        usedPlugins.push(plugin);
      }
    }
  });

  usedPlugins.forEach((plugin) => {
    // set plugin label
    const pluginLabel = "plugin" + plugin.id;
    LARA.Plugins.setNextPluginLabel(pluginLabel);
    // load the script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = plugin.url;
    script.setAttribute("data-id", pluginLabel);
    document.body.appendChild(script);
    script.onload = function() {
      console.log(`plugin${plugin.id} script loaded`);
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
  pluginType?: string;
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
          wrappedEmbeddable, wrappedEmbeddableContainer, sendCustomMessage, pluginType } = context;
  const plugin = Plugins.find(p => p.type === pluginType);
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
  LARA.Plugins.initPlugin(pluginLabel, pluginContext);
};

export const getGlossaryEmbeddable = (activity: Activity) => {
  const glossaryPlugin = activity.plugins.find((activityPlugin: Plugin) => activityPlugin.approved_script_label === "glossary");
  const embeddablePlugin: IEmbeddablePlugin | undefined = glossaryPlugin
    ? { type: "Embeddable::EmbeddablePlugin",
        plugin: glossaryPlugin,
        is_hidden: false,
        is_full_width: false,
        ref_id: ""
      }
    : undefined;
  return embeddablePlugin;
};
