import { ICustomMessage } from "@concord-consortium/lara-interactive-api";
import { Optional } from "utility-types";
import { getCachedLearnerPluginState, getLearnerPluginState, getPortalData } from "../firebase-db";
import { LaraGlobalType } from "../lara-plugin";
import { IEmbeddableContextOptions, IPluginRuntimeContextOptions } from "../lara-plugin/plugins/plugin-context";
import { Activity, SectionType, EmbeddableType, IEmbeddablePlugin, Plugin } from "../types";
import { getResourceUrl } from "../lara-api";
import { setReactionScheduler } from "mobx/dist/internal";

export interface UsedPluginInfo {
  id: number;
  loaded: boolean;
  plugin: Plugin;
}

let usedPlugins: UsedPluginInfo[] = [];

export const getUsedPlugins = () => {
  return usedPlugins;
};

export const clearUsedPlugins = () => {
  usedPlugins = [];
};

export const addUsedPlugin = (plugin: Plugin) => {
  if (!usedPlugins.find(p => p.plugin.approved_script_label === plugin.approved_script_label)) {
    usedPlugins.push({
      id: usedPlugins.length,
      loaded: false,
      plugin
    });
  }
};

export const findUsedPlugins = (activities: Activity[], teacherEditionMode: boolean) => {
  // search current activity or all activities in sequence
  activities.forEach(activity => {
    // search each page for teacher edition plugin use
    for (let page = 0; page < activity.pages.length; page++) {
      if (!activity.pages[page].is_hidden) {
        for (let section = 0; activity.pages[page].sections.length; section++) {
          if (!activity.pages[page].sections[section].is_hidden) {
            for (let embeddableNum = 0; embeddableNum < activity.pages[page].sections[section].embeddables.length; embeddableNum++) {
              const embeddable = activity.pages[page].sections[section].embeddables[embeddableNum];
              if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin?.approved_script_label === "teacherEditionTips" && teacherEditionMode) {
                addUsedPlugin(embeddable.plugin);
              }
            }
          }
        }
      }
    }

    // search plugin array for glossary plugin use
    activity.plugins.forEach((activityPlugin: Plugin) => {
      if (activityPlugin.approved_script_label === "glossary") {
        addUsedPlugin(activityPlugin);
      }
    });
  });
  return usedPlugins;
};

export const loadPluginScripts = (LARA: LaraGlobalType, activities: Activity[], handleLoadPlugins: () => void, teacherEditionMode: boolean) => {
  const plugins = findUsedPlugins(activities, teacherEditionMode);
  plugins.forEach((usedPlugin) => {
    // set plugin label
    const pluginLabel = "plugin" + usedPlugin.id;
    LARA.Plugins.setNextPluginLabel(pluginLabel);
    // load the script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = usedPlugin.plugin.approved_script.url;
    script.setAttribute("data-id", pluginLabel);
    script.onload = function() {
      if (typeof window.jest === undefined) {
        // eslint-disable-next-line no-console
        console.log(`plugin${usedPlugin.id} script loaded`);
      }
      usedPlugin.loaded = true;
      if (plugins.filter((p) => !p.loaded).length === 0) {
        handleLoadPlugins();
      }
    };
    document.body.appendChild(script);
  });
};

export interface IEmbeddablePluginContext {
  LARA: LaraGlobalType;
  embeddable: IEmbeddablePlugin;
  embeddableContainer: HTMLElement;
  wrappedEmbeddable?: EmbeddableType;
  wrappedEmbeddableContainer?: HTMLElement;
  sendCustomMessage?: (message: ICustomMessage) => void;
  approvedScriptLabel?: string;
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

// loads the learner plugin state into the firebase write-through cache
// export const loadLearnerPluginState = async (activities: Activity[], teacherEditionMode: boolean) => {
//   const plugins = findUsedPlugins(activities, teacherEditionMode);
//   return await Promise.all(plugins.map(async (plugin) => await getLearnerPluginState(plugin.id)));
// };

export const initializePlugin = (context: IEmbeddablePluginContext) => {
  const { LARA, embeddable, embeddableContainer,
          wrappedEmbeddable, wrappedEmbeddableContainer, sendCustomMessage, approvedScriptLabel } = context;
  const usedPlugin = usedPlugins.find(p => p.plugin.approved_script_label === approvedScriptLabel);
  if (!usedPlugin) return;

  const embeddableContext: Optional<IEmbeddableContextOptions, "container"> = {
    container: wrappedEmbeddableContainer,
    laraJson: wrappedEmbeddable,
    interactiveStateUrl: null,
    interactiveAvailable: true,
    sendCustomMessage
  };
  // cast to any for usage below
  const embeddableContextAny = embeddableContext as any;

  const pluginId = usedPlugin.id;
  const portalData = getPortalData();
  const pluginLabel = `plugin${pluginId}`;
  const pluginContext: IPluginRuntimeContextOptions = {
    type: "runtime",
    name: usedPlugin.plugin.approved_script.name || "",
    url: usedPlugin.plugin.approved_script.url || "",
    pluginId,
    embeddablePluginId: null,
    authoredState: embeddable.plugin?.author_data || null,
    learnerState: getCachedLearnerPluginState(pluginId),
    learnerStateSaveUrl: "",
    container: embeddableContainer,
    componentLabel: pluginLabel,
    runId: 0,
    remoteEndpoint: (portalData?.type === "authenticated" && portalData.runRemoteEndpoint) || null,
    userEmail: null,
    classInfoUrl: null,
    firebaseJwtUrl: "",
    wrappedEmbeddable: wrappedEmbeddable ? embeddableContextAny : null,
    resourceUrl: getResourceUrl()
  };
  LARA.Plugins.initPlugin(pluginLabel, pluginContext);
};

export const getGlossaryEmbeddable = (activity: Activity) => {
  const glossaryPlugin = activity.plugins.find((activityPlugin: Plugin) => activityPlugin.approved_script_label === "glossary");
  const embeddablePlugin: IEmbeddablePlugin | undefined = glossaryPlugin
    ? { type: "Embeddable::EmbeddablePlugin",
        plugin: glossaryPlugin,
        is_hidden: false,
        is_half_width: false,
        ref_id: "" // no ref_id on the glossary plugin
      }
    : undefined;
  return embeddablePlugin;
};
