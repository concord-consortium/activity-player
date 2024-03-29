import { ICustomMessage } from "@concord-consortium/lara-interactive-api";
import { getCachedLearnerPluginState, getLearnerPluginState, getPortalData } from "../firebase-db";
import { LaraGlobalType } from "../lara-plugin";
import { IEmbeddableContextOptions, IPluginRuntimeContextOptions } from "../lara-plugin/plugins/plugin-context";
import { Activity, EmbeddableType, IEmbeddablePlugin, Plugin, ApprovedScript } from "../types";
import { getResourceUrl } from "../lara-api";

export interface UsedApprovedScriptInfo {
  id: number;
  loaded: boolean;
  approvedScript: ApprovedScript;
}

let usedApprovedScripts: UsedApprovedScriptInfo[] = [];

export const getUsedApprovedScripts = () => {
  return usedApprovedScripts;
};

export const clearUsedApprovedScripts = () => {
  usedApprovedScripts = [];
};

export const addUsedApprovedScript = (plugin: Plugin) => {
  // LARA is exporting some plugins with approved_script as null, probably due to deleted data.
  // This will need to be fixed in LARA but this is a quick bandaid until that is done.
  if (plugin.approved_script && !usedApprovedScripts.find(scriptInfo =>  scriptInfo.approvedScript.label === plugin.approved_script_label)) {
    usedApprovedScripts.push({
      id: usedApprovedScripts.length,
      loaded: false,
      approvedScript: plugin.approved_script
    });
  }
};

export const findUsedApprovedScripts = (activities: Activity[]) => {
  // search current activity or all activities in sequence
  activities.forEach(activity => {
    // search each page for teacher edition plugin use
    for (let page = 0; page < activity.pages.length; page++) {
      if (!activity.pages[page].is_hidden) {
        for (let section = 0; section < activity.pages[page].sections.length; section++) {
          if (!activity.pages[page].sections[section].is_hidden) {
            for (let embeddableNum = 0; embeddableNum < activity.pages[page].sections[section].embeddables.length; embeddableNum++) {
              const embeddable = activity.pages[page].sections[section].embeddables[embeddableNum];
              // NOTE: TODO this needs to be fixed.
              //This change might cause there to be extra space when running in non teacher edition mode and viewing a page with
              // with teacher edition items on it.
              //The issue is that the teacher edition item wrapper will be added to the page, and then the teacher edition plugin inside
              //of it will decide not render anything because the app isn't in teacher edition mode.
              //That behavior by itself is correct because we are trying to not have these "modes" be explicitly part of the
              //activity player (or lara runtime). But the problem is that the item wrapper usually has some padding or margins.
              //So even though it has no real content, the padding will still show up in the runtime.
              //This change was from master when new-sections was rebased on it.
              if (embeddable.type === "Embeddable::EmbeddablePlugin" && embeddable.plugin) {
                addUsedApprovedScript(embeddable.plugin);
              }
            }
          }
        }
      }
    }
    // Add activity-level plugins too
    activity.plugins.forEach((activityPlugin: Plugin) => {
      addUsedApprovedScript(activityPlugin);
    });
  });
  return usedApprovedScripts;
};

export const loadPluginScripts = (LARA: LaraGlobalType, activities: Activity[], handleLoadScripts: () => void) => {
  const scripts = findUsedApprovedScripts(activities);
  scripts.forEach((usedScriptInfo) => {
    // set plugin label
    const pluginLabel = "plugin" + usedScriptInfo.id;
    LARA.Plugins.setNextPluginLabel(pluginLabel);
    // load the script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = usedScriptInfo.approvedScript.url;
    script.setAttribute("data-id", pluginLabel);
    script.onload = function() {
      if (typeof window.jest === undefined) {
        // eslint-disable-next-line no-console
        console.log(`plugin${usedScriptInfo.id} script loaded`);
      }
      usedScriptInfo.loaded = true;
      if (scripts.filter((p) => !p.loaded).length === 0) {
        handleLoadScripts();
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
export const loadLearnerPluginState = async (activities: Activity[]) => {
  const approvedScripts = findUsedApprovedScripts(activities);
  // PJ 09/19/2021: This doesn't seem to make sense. Currently, the state is saved and restored per approved script.
  // It should be saved and restored per plugin instance. It works with Glossary only because there's one glossary
  // instance per activity. Fixing this would destroy students data, so I'm not doing this. But it should be handled
  // if we ever add more plugins that save their state.
  return await Promise.all(approvedScripts.map(async (approvedScriptInfo) => await getLearnerPluginState(approvedScriptInfo.id)));
};

export const initializePlugin = (context: IEmbeddablePluginContext) => {
  const { LARA, embeddable, embeddableContainer,
          wrappedEmbeddable, wrappedEmbeddableContainer, sendCustomMessage } = context;
  const approvedScriptLabel = embeddable.plugin?.approved_script_label;

  const usedScript = usedApprovedScripts.find(p => p.approvedScript.label === approvedScriptLabel);
  if (!usedScript) return;

  let embeddableContext: IEmbeddableContextOptions | null = null;
  if (wrappedEmbeddable && wrappedEmbeddableContainer) {
    let clickToPlay = false;
    if (wrappedEmbeddable.type === "ManagedInteractive") {
      clickToPlay = !!wrappedEmbeddable.library_interactive?.data.click_to_play;
    } else if (wrappedEmbeddable.type === "MwInteractive") {
      clickToPlay = !!wrappedEmbeddable.click_to_play;
    }

    embeddableContext = {
      container: wrappedEmbeddableContainer,
      laraJson: wrappedEmbeddable,
      interactiveStateUrl: null,
      interactiveAvailable: !clickToPlay,
      sendCustomMessage
    };
  }

  const approvedScriptId = usedScript.id;
  const pluginId = embeddable.plugin?.id || 0;
  const portalData = getPortalData();
  const pluginLabel = `plugin${approvedScriptId}`;
  const pluginContext: IPluginRuntimeContextOptions = {
    type: "runtime",
    name: usedScript.approvedScript.name || "",
    url: usedScript.approvedScript.url || "",
    pluginId,
    embeddablePluginId: null,
    authoredState: embeddable.plugin?.author_data || null,
    // PJ 09/19/2021: This doesn't seem to make sense. State is restored per approved script, not per plugin instance.
    // Not fixing this, as it'd break glossary student data. See related comment in loadLearnerPluginState().
    learnerState: getCachedLearnerPluginState(approvedScriptId),
    learnerStateSaveUrl: "",
    container: embeddableContainer,
    componentLabel: pluginLabel,
    runId: 0,
    remoteEndpoint: (portalData?.type === "authenticated" && portalData.runRemoteEndpoint) || null,
    userEmail: null,
    classInfoUrl: null,
    firebaseJwtUrl: "",
    wrappedEmbeddable: embeddableContext,
    resourceUrl: getResourceUrl()
  };
  LARA.Plugins.initPlugin(pluginLabel, pluginContext);
};

export const getActivityLevelPlugins = (activity: Activity) => {
  const plugins = activity.plugins;
  const activityLevelPlugins: IEmbeddablePlugin[] =
    plugins.map((plugin) => {
      return {
        type: "Embeddable::EmbeddablePlugin",
        plugin,
        is_hidden: false,
        is_half_width: false,
        ref_id: "" // no ref_id's on embeddable plugins except for teacher edition
      };
     });
  return activityLevelPlugins;
};
