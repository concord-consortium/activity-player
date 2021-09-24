// import { Activity, Plugin } from "../types";
// import { addUsedPlugin, clearUsedPlugins, findUsedPlugins, getGlossaryEmbeddable, getUsedPlugins, IEmbeddablePluginContext, initializePlugin, IPartialEmbeddablePluginContext, loadLearnerPluginState, loadPluginScripts, validateEmbeddablePluginContextForPlugin, validateEmbeddablePluginContextForWrappedEmbeddable } from "./plugin-utils";
// import sampleActivityGlossaryPlugin from "../data/sample-activity-glossary-plugin.json";
// import { LaraGlobalType } from "../lara-plugin";
// import { clearCachedLearnerPluginState, getCachedLearnerPluginState, setLearnerPluginState, setPortalData } from "../firebase-db";

// describe("Plugin utility functions", () => {

//   const plugin: Plugin = {
//     description: "Test Plugin",
//     author_data: "",
//     approved_script_label: "test",
//     component_label: "Test",
//     approved_script: {
//       name: "Test Script",
//       url: "https://example.com/plugin.js",
//       label: "test",
//       description: "Test Script",
//       version: "1.0.0",
//       json_url: "https://example.com/manifest.json",
//       authoring_metadata: ""
//     }
//   };

//   const activity: Activity = sampleActivityGlossaryPlugin as Activity;

//   const partialContext: IPartialEmbeddablePluginContext = {
//     LARA: {} as any,
//     embeddable: {} as any,
//     embeddableContainer: {} as any,
//     wrappedEmbeddable: {} as any,
//     wrappedEmbeddableContainer: {} as any
//   };

//   describe("#addUsedPlugin", () => {
//     beforeEach(() => clearUsedPlugins());

//     it("adds a used plugin when not already in the list", () => {
//       expect(getUsedPlugins()).toEqual([]);
//       addUsedPlugin(plugin);
//       expect(getUsedPlugins()).toEqual([{
//         id: 0,
//         loaded: false,
//         plugin
//       }]);
//     });

//     it("does not add a used plugin when it is already in the list", () => {
//       expect(getUsedPlugins().length).toEqual(0);
//       addUsedPlugin(plugin);
//       expect(getUsedPlugins().length).toEqual(1);
//       addUsedPlugin(plugin);
//       expect(getUsedPlugins().length).toEqual(1);
//     });
//   });

//   describe("#findUsedPlugins", () => {
//     beforeEach(() => {
//       clearUsedPlugins();
//     });

//     it("works in teacher edition mode", () => {
//       const usedPlugins = findUsedPlugins([activity], true);
//       expect(usedPlugins.map(p => p.plugin.approved_script_label)).toEqual(["teacherEditionTips", "glossary"]);
//     });

//     it("works in non teacher edition mode", () => {
//       const usedPlugins = findUsedPlugins([activity], false);
//       expect(usedPlugins.map(p => p.plugin.approved_script_label)).toEqual(["glossary"]);
//     });
//   });

//   describe("#loadPluginScripts", () => {
//     const MockLARA: LaraGlobalType = {
//       Plugins: {
//         setNextPluginLabel: jest.fn()
//       }
//     } as any;
//     const handleLoadPlugins = jest.fn();
//     let savedAppendChild: any;

//     beforeEach(() => {
//       clearUsedPlugins();
//       jest.resetAllMocks();
//       savedAppendChild = document.body.appendChild;
//       document.body.appendChild = jest.fn((script: HTMLScriptElement) => {
//         (script.onload as any)();
//       }) as any;
//     });

//     afterEach(() => {
//       document.body.appendChild = savedAppendChild;
//     });

//     it("handles teacher edition mode", () => {
//       loadPluginScripts(MockLARA, [activity], handleLoadPlugins, true);
//       expect(MockLARA.Plugins.setNextPluginLabel).toHaveBeenCalledTimes(2);
//       expect(handleLoadPlugins).toHaveBeenCalledTimes(1);
//     });

//     it("handles non teacher edition mode", () => {
//       loadPluginScripts(MockLARA, [activity], handleLoadPlugins, false);
//       expect(MockLARA.Plugins.setNextPluginLabel).toHaveBeenCalledTimes(1);
//       expect(handleLoadPlugins).toHaveBeenCalledTimes(1);
//     });

//   });

//   describe("#validateEmbeddablePluginContextForPlugin", () => {
//     it("works when all the elements exist", () => {
//       const result = validateEmbeddablePluginContextForPlugin(partialContext);
//       expect(result?.LARA).toEqual(partialContext.LARA);
//       expect(result?.embeddable).toEqual(partialContext.embeddable);
//       expect(result?.embeddableContainer).toEqual(partialContext.embeddableContainer);
//     });
//   });

//   describe("#validateEmbeddablePluginContextForWrappedEmbeddable", () => {
//     it("works when all the wrapped elements exist", () => {
//       const result = validateEmbeddablePluginContextForWrappedEmbeddable(partialContext);
//       expect(result?.LARA).toEqual(partialContext.LARA);
//       expect(result?.embeddable).toEqual(partialContext.embeddable);
//       expect(result?.embeddableContainer).toEqual(partialContext.embeddableContainer);
//     });
//   });

//   describe("#loadLearnerPluginState", () => {
//     beforeEach(async () => {
//       clearUsedPlugins();
//       setPortalData({
//         type: "authenticated",
//         contextId: "context-id",
//         database: {
//           appName: "report-service-dev",
//           sourceKey: "localhost",
//           rawFirebaseJWT: "abc"
//         },
//         offering: {
//           id: 1,
//           activityUrl: "http://example/activities/1",
//           rubricUrl: ""
//         },
//         platformId: "https://example",
//         platformUserId: "1",
//         resourceLinkId: "2",
//         resourceUrl: "http://example/resource",
//         toolId: "activity-player.concord.org",
//         userType: "learner",
//         runRemoteEndpoint: ""
//       });
//       // these will fail as there is no firebase connection but it will populate the internal cache
//       try {
//         await setLearnerPluginState(0, "test 1");
//       } catch (e) {} // eslint-disable-line no-empty
//       try {
//         await setLearnerPluginState(1, "test 2");
//       } catch (e) {} // eslint-disable-line no-empty
//     });

//     it("captures the learner plugin state in a local cache", () => {
//       // cache is set in the beforeEach() call above...
//       expect(getCachedLearnerPluginState(0)).toBe("test 1");
//       expect(getCachedLearnerPluginState(1)).toBe("test 2");
//     });

//     it("returns the state for all plugins in teacher mode", async () => {
//       const pluginState = await loadLearnerPluginState([activity], true);
//       expect(pluginState).toEqual(["test 1", "test 2"]);
//     });

//     it("returns the state for all plugins in non teacher mode", async () => {
//       const pluginState = await loadLearnerPluginState([activity], false);
//       expect(pluginState).toEqual(["test 1"]);
//     });
//   });

//   describe("#initializePlugin", () => {
//     const context: IEmbeddablePluginContext = {
//       LARA: {
//         Plugins: {
//           initPlugin: jest.fn()
//         } as any
//       } as any,
//       embeddable: {
//         plugin: null
//       },
//       wrappedEmbeddable: {} as any,
//       wrappedEmbeddableContainer: {} as any,
//       embeddableContainer: {} as any,
//       approvedScriptLabel: plugin.approved_script_label,
//       sendCustomMessage: jest.fn()
//     } as any;

//     beforeEach(() => {
//       clearUsedPlugins();
//       clearCachedLearnerPluginState();
//       jest.resetAllMocks();
//     });

//     it("does not initialize the plugin if it isn't added first", () => {
//       initializePlugin(context);
//       expect(context.LARA.Plugins.initPlugin).toHaveBeenCalledTimes(0);
//     });

//     it("initializes the plugin", () => {
//       addUsedPlugin(plugin);
//       initializePlugin(context);
//       expect(context.LARA.Plugins.initPlugin).toHaveBeenCalledTimes(1);
//       expect(context.LARA.Plugins.initPlugin).toHaveBeenCalledWith("plugin0", {
//         type: "runtime",
//         name: plugin.approved_script.name,
//         url: plugin.approved_script.url,
//         pluginId: 0,
//         embeddablePluginId: null,
//         authoredState: null,
//         learnerState: null,
//         learnerStateSaveUrl: "",
//         container: context.embeddableContainer,
//         componentLabel: "plugin0",
//         runId: 0,
//         remoteEndpoint: null,
//         userEmail: null,
//         classInfoUrl: null,
//         firebaseJwtUrl: "",
//         wrappedEmbeddable: {
//           container: context.wrappedEmbeddableContainer,
//           laraJson: context.wrappedEmbeddable,
//           interactiveStateUrl: null,
//           interactiveAvailable: true,
//           sendCustomMessage: context.sendCustomMessage
//         },
//         resourceUrl: ""
//       });
//     });
//   });

//   describe("#getGlossaryEmbeddable", () => {
//     it("finds the glossary plugin", () => {
//       const glossaryPlugin = getGlossaryEmbeddable(activity);
//       expect(glossaryPlugin).toBeDefined();
//       expect(glossaryPlugin?.type).toBe("Embeddable::EmbeddablePlugin");
//     });
//   });

// });
