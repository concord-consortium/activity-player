import { IPluginRuntimeContext, IJwtResponse, IClassInfo, IPluginAuthoringContext, IJwtClaims } from "../plugin-api";
import { ILogData } from "../events";
import { ICustomMessage } from "@concord-consortium/lara-interactive-api";
import { generateEmbeddableRuntimeContext } from "./embeddable-runtime-context";
// ACTIVITY_PLAYER_CODE:
import $ from "jquery";
// LARA_CODE import * as $ from "jquery";
// ACTIVITY_PLAYER_CODE:
import { Logger } from "../../lib/logger";
import { getStorage } from "../../storage/storage-facade";
import { getFirebaseJWT } from "../../portal-api";

export type IPluginContextOptions = IPluginRuntimeContextOptions | IPluginAuthoringContextOptions;

interface IPluginCommonOptions {
  /** Name of the plugin */
  name: string;
  /** Url from which the plugin was loaded. */
  url: string;
  /** Plugin instance ID. */
  pluginId: number;
  /** The authored configuration for this instance (if available). */
  authoredState: string | null;
  /** HTMLElement created by LARA for the plugin to use to render both its runtime and authoring output. */
  container: HTMLElement;
  /** Name of plugin component */
  componentLabel: string;
  /** Wrapped embeddable runtime context if plugin is wrapping some embeddable and the plugin has the
   * guiPreview option set to true within its manifest.
   */
  wrappedEmbeddable: IEmbeddableContextOptions | null;
  /** URL to fetch a JWT. Includes generic `_FIREBASE_APP_` that should be replaced with app name. */
  firebaseJwtUrl: string;
}

/** Data generated by LARA, passed to .initPlugin function, and then used to generate final IPluginRuntimeContext */
export interface IPluginRuntimeContextOptions extends IPluginCommonOptions {
  /** Type of the plugin */
  type: "runtime";
  /** The saved learner data for this instance (if available). */
  learnerState: string | null;
  /** URL used to save plugin state. */
  learnerStateSaveUrl: string;
  /** The run ID for the current LARA run. */
  runId: number;
  /** The portal remote endpoint (if available). */
  remoteEndpoint: string | null;
  /** The current users email address (if available). */
  userEmail: string | null;
  /** The portal URL for class details (if available). */
  classInfoUrl: string | null;
  /** The ID of the Embeddable that has been added to page, this embeddable refers to the plugin instance */
  embeddablePluginId: number | null;
  /** URL of the resource associated with the current run (sequence URL or activity URL) */
  resourceUrl: string;
  /** Flag denoting offline mode of an Activity Player activity */
  offlineMode: boolean;
}

export interface IPluginAuthoringContextOptions extends IPluginCommonOptions {
  /** Type of the plugin */
  type: "authoring";
  /** URL used to save plugin authoring state. */
  authorDataSaveUrl: string;
}

/** Data generated by LARA, passed to .initPlugin function, and then used to generate final IEmbeddableRuntimeContext */
export interface IEmbeddableContextOptions {
  /** Embeddable container. */
  container: HTMLElement;
  /****************************************************************************
   Serialized form of the embeddable. Defined by LARA export code, so it's format cannot be specified here.
   Example (interactive):
   ```
   {
     aspect_ratio_method: "DEFAULT",
     authored_state: null,
     click_to_play: false,
     enable_learner_state: true,
     name: "Test Interactive",
     native_height: 435,
     native_width: 576,
     url: "http://concord-consortium.github.io/lara-interactive-api/iframe.html",
     type: "MwInteractive",
     ref_id: "86-MwInteractive"
   }
   ```
   ****************************************************************************/
  laraJson: any;
  /** Interactive state URL, available only when plugin is wrapping an interactive. */
  interactiveStateUrl: string | null;
  /** True if the interactive is immediately available for use */
  interactiveAvailable: boolean;
  /** Callback function which plugin can use to send custom messages to interactive */
  sendCustomMessage?: (message: ICustomMessage) => void;
}

const ajaxPromise = (url: string, data: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    $.ajax({
      url,
      type: "PUT",
      data,
      success(result) {
        resolve(result);
      },
      error(jqXHR, errText, err) {
        reject(err);
      }
    });
  });
};

export const saveAuthoredPluginState = (authoringSaveStateUrl: string, authorData: string): Promise<string> => {
  // disable the submit on the container form until the ajax call returns so that the ajax call can complete
  // TODO: this code should be removed when this story changes how we render authoring forms
  // https://www.pivotaltracker.com/story/show/167500798
  type MaybeForm = HTMLFormElement | undefined;
  const editPluginForm = document.getElementsByClassName("edit_plugin")[0] as MaybeForm;
  const editEmbeddedPluginForm = document.getElementsByClassName("edit_embeddable_embeddable_plugin")[0] as MaybeForm;
  const editForm = editPluginForm || editEmbeddedPluginForm;
  const preventFormClosing = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
  };
  editForm?.addEventListener("submit", preventFormClosing);

  return ajaxPromise(authoringSaveStateUrl, { author_data: authorData })
          .then((result) => {
            editForm?.removeEventListener("submit", preventFormClosing);
            editForm?.submit();
            return result;
          })
          .catch((err) => {
            editForm?.removeEventListener("submit", preventFormClosing);
            window.alert(`Unable to save authored state: ${err.toString()}`);
            throw err;
          });
};

const getFirebaseJwtFromPortal = (appName: string): Promise<IJwtResponse> => {
  return new Promise<IJwtResponse>((resolve, reject) => {
    const storage = getStorage();
    const portalData = storage.getPortalData();
    if (portalData && (portalData.type === "authenticated") && portalData.basePortalUrl && portalData.rawPortalJWT) {
      return getFirebaseJWT(portalData.basePortalUrl, portalData.rawPortalJWT, {firebase_app: appName})
        .then(([token, firebaseJWT]) => {
          resolve({token, claims: firebaseJWT as unknown as IJwtClaims});
          // reject("test login");
        })
        .catch(reject);
    } else {
      reject(`Unable to get Firebase JWT for ${appName}, not logged in.`);
    }
  });
};

const getClassInfo = (classInfoUrl: string | null): Promise<IClassInfo> | null => {
  if (!classInfoUrl) {
    return null;
  }
  return fetch(classInfoUrl, {method: "get", credentials: "include"}).then(resp => resp.json());
};

const log = (context: IPluginRuntimeContextOptions, logData: string | ILogData): void => {
  // LARA_CODE const logger = (window as any).loggerUtils;
  // LARA_CODE if (logger) {
  // ACTIVITY_PLAYER_CODE:
  if (Logger) {
    if (typeof(logData) === "string") {
      logData = {event: logData};
    }
    const pluginLogData = Object.assign(fetchPluginEventLogData(context), logData);
    // LARA_CODE logger.log(pluginLogData);
    // ACTIVITY_PLAYER_CODE:
    const { event, event_value, ...parameters } = pluginLogData;
    Logger.log({
      event,
      event_value,
      parameters
    });
  }
};

const fetchPluginEventLogData = (context: IPluginRuntimeContextOptions) => {
  const logData: any = {
    plugin_id: context.pluginId
  };
  if (context.embeddablePluginId) {
    logData.embeddable_plugin_id = context.embeddablePluginId;
  }
  if (context.wrappedEmbeddable) {
    logData.wrapped_embeddable_type = context.wrappedEmbeddable.laraJson.type;
    logData.wrapped_embeddable_id = context.wrappedEmbeddable.laraJson.ref_id;
  }
  return logData;
};

export const generateRuntimePluginContext = (options: IPluginRuntimeContextOptions): IPluginRuntimeContext => {
  const storage = getStorage();
  const context = {
    name: options.name,
    url: options.url,
    pluginId: options.pluginId,
    authoredState: options.authoredState,
    learnerState: options.learnerState,
    container: options.container,
    runId: options.runId,
    remoteEndpoint: options.remoteEndpoint,
    userEmail: options.userEmail,
    resourceUrl: options.resourceUrl,
    saveLearnerPluginState: (state: string) => storage.setLearnerPluginState(options.pluginId, state),
    getClassInfo: () => getClassInfo(options.classInfoUrl),
    getFirebaseJwt: (appName: string) => getFirebaseJwtFromPortal(appName),
    wrappedEmbeddable: options.wrappedEmbeddable ? generateEmbeddableRuntimeContext(options.wrappedEmbeddable) : null,
    log: (logData: string | ILogData) => log(options, logData)
  };
  return context;
};

export const generateAuthoringPluginContext = (options: IPluginAuthoringContextOptions): IPluginAuthoringContext => {
  return {
    name: options.name,
    url: options.url,
    pluginId: options.pluginId,
    authoredState: options.authoredState,
    container: options.container,
    componentLabel: options.componentLabel,
    saveAuthoredPluginState: (state: string) => saveAuthoredPluginState(options.authorDataSaveUrl, state),
    wrappedEmbeddable: options.wrappedEmbeddable ? generateEmbeddableRuntimeContext(options.wrappedEmbeddable) : null,
    getFirebaseJwt: (appName: string) => getFirebaseJwtFromPortal(appName)
  };
};
