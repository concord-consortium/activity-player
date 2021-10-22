import { Activity, Plugin } from "../types";
import {
  addUsedApprovedScript, clearUsedApprovedScripts, findUsedApprovedScripts, getGlossaryEmbeddable, getUsedApprovedScripts, IEmbeddablePluginContext,
  initializePlugin, IPartialEmbeddablePluginContext, loadLearnerPluginState, loadPluginScripts,
  validateEmbeddablePluginContextForPlugin, validateEmbeddablePluginContextForWrappedEmbeddable
} from "./plugin-utils";
import sampleActivityGlossaryPlugin from "../data/sample-activity-glossary-plugin.json";
import { LaraGlobalType } from "../lara-plugin";
import { clearCachedLearnerPluginState, getCachedLearnerPluginState, setLearnerPluginState, setPortalData } from "../firebase-db";
import { RawClassInfo } from "../portal-api";

describe("Plugin utility functions", () => {

  const plugin: Plugin = {
    id: 123,
    description: "Test Plugin",
    author_data: "",
    approved_script_label: "test",
    component_label: "Test",
    approved_script: {
      name: "Test Script",
      url: "https://example.com/plugin.js",
      label: "test",
      description: "Test Script",
      version: "1.0.0",
      json_url: "https://example.com/manifest.json",
      authoring_metadata: ""
    }
  };

  const activity: Activity = sampleActivityGlossaryPlugin as Activity;

  const partialContext: IPartialEmbeddablePluginContext = {
    LARA: {} as any,
    embeddable: {} as any,
    embeddableContainer: {} as any,
    wrappedEmbeddable: {} as any,
    wrappedEmbeddableContainer: {} as any
  };

  describe("#addUsedApprovedScript", () => {
    beforeEach(() => clearUsedApprovedScripts());

    it("adds a used plugin when not already in the list", () => {
      expect(getUsedApprovedScripts()).toEqual([]);
      addUsedApprovedScript(plugin);
      expect(getUsedApprovedScripts()).toEqual([{
        id: 0,
        loaded: false,
        approvedScript: plugin.approved_script
      }]);
    });

    it("does not add a used plugin when it is already in the list", () => {
      expect(getUsedApprovedScripts().length).toEqual(0);
      addUsedApprovedScript(plugin);
      expect(getUsedApprovedScripts().length).toEqual(1);
      addUsedApprovedScript(plugin);
      expect(getUsedApprovedScripts().length).toEqual(1);
    });
  });

  describe("#findUsedApprovedScripts", () => {
    beforeEach(() => {
      clearUsedApprovedScripts();
    });

    it("returns all the approved scripts used by plugins", () => {
      const usedApprovedScripts = findUsedApprovedScripts([activity]);
      expect(usedApprovedScripts.map(p => p.approvedScript.label)).toEqual(["teacherEditionTips", "glossary"]);
    });
  });

  describe("#loadPluginScripts", () => {
    const MockLARA: LaraGlobalType = {
      Plugins: {
        setNextPluginLabel: jest.fn()
      }
    } as any;
    const handleLoadPlugins = jest.fn();
    let savedAppendChild: any;

    beforeEach(() => {
      clearUsedApprovedScripts();
      jest.resetAllMocks();
      savedAppendChild = document.body.appendChild;
      document.body.appendChild = jest.fn((script: HTMLScriptElement) => {
        (script.onload as any)();
      }) as any;
    });

    afterEach(() => {
      document.body.appendChild = savedAppendChild;
    });

    it("loads all the scripts used by plugins", () => {
      loadPluginScripts(MockLARA, [activity], handleLoadPlugins);
      expect(MockLARA.Plugins.setNextPluginLabel).toHaveBeenCalledTimes(2);
      expect(handleLoadPlugins).toHaveBeenCalledTimes(1);
    });
  });

  describe("#validateEmbeddablePluginContextForPlugin", () => {
    it("works when all the elements exist", () => {
      const result = validateEmbeddablePluginContextForPlugin(partialContext);
      expect(result?.LARA).toEqual(partialContext.LARA);
      expect(result?.embeddable).toEqual(partialContext.embeddable);
      expect(result?.embeddableContainer).toEqual(partialContext.embeddableContainer);
    });
  });

  describe("#validateEmbeddablePluginContextForWrappedEmbeddable", () => {
    it("works when all the wrapped elements exist", () => {
      const result = validateEmbeddablePluginContextForWrappedEmbeddable(partialContext);
      expect(result?.LARA).toEqual(partialContext.LARA);
      expect(result?.embeddable).toEqual(partialContext.embeddable);
      expect(result?.embeddableContainer).toEqual(partialContext.embeddableContainer);
    });
  });

  describe("#loadLearnerPluginState", () => {
    beforeEach(async () => {
      clearUsedApprovedScripts();
      setPortalData({
        type: "authenticated",
        contextId: "context-id",
        database: {
          appName: "report-service-dev",
          sourceKey: "localhost",
          rawFirebaseJWT: "abc"
        },
        offering: {
          id: 1,
          activityUrl: "http://example/activities/1",
          rubricUrl: ""
        },
        platformId: "https://example",
        platformUserId: "1",
        resourceLinkId: "2",
        resourceUrl: "http://example/resource",
        toolId: "activity-player.concord.org",
        userType: "learner",
        runRemoteEndpoint: "",
        rawClassInfo: {} as RawClassInfo,
        collaboratorsDataUrl: "https://example.com/collaborations/1234",
      });
      // these will fail as there is no firebase connection but it will populate the internal cache
      try {
        await setLearnerPluginState(0, "test 1");
      } catch (e) {} // eslint-disable-line no-empty
      try {
        await setLearnerPluginState(1, "test 2");
      } catch (e) {} // eslint-disable-line no-empty
    });

    it("captures the learner plugin state in a local cache", () => {
      // cache is set in the beforeEach() call above...
      expect(getCachedLearnerPluginState(0)).toBe("test 1");
      expect(getCachedLearnerPluginState(1)).toBe("test 2");
    });

    it("returns the state for all plugins", async () => {
      const pluginState = await loadLearnerPluginState([activity]);
      expect(pluginState).toEqual(["test 1", "test 2"]);
    });
  });

  describe("#initializePlugin", () => {
    const context: IEmbeddablePluginContext = {
      LARA: {
        Plugins: {
          initPlugin: jest.fn()
        } as any
      } as any,
      embeddable: {
        plugin: {
          approved_script_label: "test"
        }
      },
      wrappedEmbeddable: {} as any,
      wrappedEmbeddableContainer: {} as any,
      embeddableContainer: {} as any,
      approvedScriptLabel: plugin.approved_script_label,
      sendCustomMessage: jest.fn()
    } as any;

    beforeEach(() => {
      clearUsedApprovedScripts();
      clearCachedLearnerPluginState();
      jest.resetAllMocks();
    });

    it("does not initialize the plugin if it isn't added first", () => {
      initializePlugin(context);
      expect(context.LARA.Plugins.initPlugin).toHaveBeenCalledTimes(0);
    });

    it("initializes the plugin", () => {
      addUsedApprovedScript(plugin);
      initializePlugin(context);
      expect(context.LARA.Plugins.initPlugin).toHaveBeenCalledTimes(1);
      expect(context.LARA.Plugins.initPlugin).toHaveBeenCalledWith("plugin0", {
        type: "runtime",
        name: plugin.approved_script.name,
        url: plugin.approved_script.url,
        pluginId: 0,
        embeddablePluginId: null,
        authoredState: null,
        learnerState: null,
        learnerStateSaveUrl: "",
        container: context.embeddableContainer,
        componentLabel: "plugin0",
        runId: 0,
        remoteEndpoint: null,
        userEmail: null,
        classInfoUrl: null,
        firebaseJwtUrl: "",
        wrappedEmbeddable: {
          container: context.wrappedEmbeddableContainer,
          laraJson: context.wrappedEmbeddable,
          interactiveStateUrl: null,
          interactiveAvailable: true,
          sendCustomMessage: context.sendCustomMessage
        },
        resourceUrl: ""
      });
    });
  });

  describe("#getGlossaryEmbeddable", () => {
    it("finds the glossary plugin", () => {
      const glossaryPlugin = getGlossaryEmbeddable(activity);
      expect(glossaryPlugin).toBeDefined();
      expect(glossaryPlugin?.type).toBe("Embeddable::EmbeddablePlugin");
    });
  });

});
