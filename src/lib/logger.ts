import { v4 as uuid } from "uuid";
import { DEBUG_LOGGER } from "../lib/debug";
import { LaraGlobalType } from "../lara-plugin/index";
import { Role } from "../student-info";
import { dexieStorage } from "../storage/dexie-storage";
import { LogMessage } from "../types";
import { isProduction } from "../utilities/host-utils";

interface LogMessageWithId extends LogMessage {
  id?: string;  // has to optional to allow deletes
}

export interface LogParams {
  event: string | LogEventName,
  event_value?: any,
  parameters?: any,
  interactive_id?: string | undefined,
  interactive_url?: string | undefined
}

export enum LogEventName {
  change_sequence_activity,
  change_activity_page,
  show_sequence_intro_page,
  toggle_modal_dialog,
  iframe_interaction,
  toggle_sidebar,
  toggle_collapsible_column,
  create_report,
  toggle_hint,
  show_idle_warning,
  go_back_to_portal,
  continue_session,
  session_timeout
}

export interface ILogSyncUpdate {
  status: "started" | "working" | "failed" | "completed";
  message?: string;
}

export type LogSyncUpdateCallback = (update: ILogSyncUpdate) => void;

export class Logger {
  private logManagerUrl = "//cc-log-manager.herokuapp.com/api/logs";

  public static initializeLogger(LARA: LaraGlobalType,
                                 username: string,
                                 role: Role,
                                 classHash: string,
                                 teacherEdition: boolean,
                                 sequence: string | undefined,
                                 sequenceActivityIndex: number,
                                 activity: string | undefined,
                                 activityPage: number,
                                 runRemoteEndpoint: string,
                                 offlineMode: boolean) {
    if (DEBUG_LOGGER) {
      console.log("Logger#initializeLogger called.");
    }
    this._instance = new Logger(LARA, username, role, classHash, teacherEdition, sequence, sequenceActivityIndex, activity, activityPage, runRemoteEndpoint, offlineMode);
  }

  public static updateActivity(activity: string) {
    if (this._instance) {
      this._instance.activity = activity;
    }
  }

  public static updateActivityPage(page: number) {
    if (this._instance) {
      this._instance.activityPage = page;
    }
  }

  public static updateSequenceActivityindex(index: number) {
    if (this._instance) {
      this._instance.sequenceActivityIndex = index;
    }
  }

  public static setActivity(activity: string) {
    if (this._instance) {
      this._instance.activity = activity;
    }
  }

  public static log(logParams: LogParams) {
    if (!this._instance) return;
    const { event, parameters, event_value, interactive_id, interactive_url  } = logParams;
    const eventString = typeof event === "string" ? event : LogEventName[event];
    const logMessage = Logger.Instance.createLogMessage(eventString, parameters, event_value, interactive_id, interactive_url);
    this._instance.LARA.Events.emitLog(logMessage);
    if (this._instance.offlineMode) {
      this._instance.saveLogMessage(logMessage);
    } else {
      this._instance.sendToLoggingService(logMessage);
    }
  }

  public static async syncOfflineLogs(updateCallback: LogSyncUpdateCallback) {
    const instance = this._instance;
    if (!instance) return;

    const heartbeat = (message: string) => updateCallback({status: "working", message});

    updateCallback({status: "started"});

    const {activity, classHash, username, runRemoteEndpoint} = instance;
    if (activity) {
      heartbeat("Querying logs...");
      const logs = await dexieStorage.logs.where("activity").equals(activity).toArray();

      heartbeat(`Found ${logs.length} logs`);

      // we want to try to upload the logs in the order they are stored so this a
      // hack to do iteration on awaits, see https://stackoverflow.com/a/49499491
      await logs.reduce(async (promise, log: LogMessageWithId) => {
        await promise;

        // extract the dexie id but don't send it to the log manager
        const id = log.id as string;
        delete log.id;

        // update the log entry with the portal data
        log = {...log, classHash, username, run_remote_endpoint: runRemoteEndpoint };

        try {
          heartbeat(`Uploading log #${id}`);
          const logged = await instance.sendToLoggingServiceAndWaitForReply(log);

          if (logged) {
            heartbeat(`Deleting log #${id}`);

            // delete the log entry
            await dexieStorage.logs.where("id").equals(id).delete();
          }
        } catch (e) {
          // don't fail here
          heartbeat(`Failed uploading log #${id}: ${e.toString()}`);
        }
      }, Promise.resolve());
    }

    updateCallback({status: "completed"});
  }

  private static _instance?: Logger;

  public static get Instance() {
    if (this._instance) {
      return this._instance;
    }
    throw new Error("Logger not initialized yet.");
  }

  private LARA: LaraGlobalType;
  private username: string;
  private role: Role;
  private classHash: string;
  private session: string;
  private appMode: string;
  private sequence: string | undefined;
  private sequenceActivityIndex: number;
  private activity: string | undefined;
  private activityPage: number;
  private runRemoteEndpoint: string;
  private offlineMode: boolean;

  private constructor(LARA: LaraGlobalType,
                      username: string,
                      role: Role,
                      classHash: string,
                      teacherEdition: boolean,
                      sequence: string | undefined,
                      sequenceActivityIndex: number,
                      activity: string | undefined,
                      activityPage: number,
                      runRemoteEndpoint: string,
                      offlineMode: boolean) {
    this.LARA = LARA;
    this.session = uuid();
    this.username = username;
    this.role = role;
    this.classHash= classHash;
    this.appMode = teacherEdition ? "teacher edition" : "";
    this.sequence = sequence;
    this.sequenceActivityIndex = sequenceActivityIndex;
    this.activity = activity;
    this.activityPage = activityPage;
    this.runRemoteEndpoint = runRemoteEndpoint;
    this.offlineMode = offlineMode;

    this.logManagerUrl = isProduction(window.location)
      ? "//cc-log-manager.herokuapp.com/api/logs"
      : "//cc-log-manager-dev.herokuapp.com/api/logs";
  }

  private createLogMessage(
    event: string,
    parameters?: Record<string, unknown>,
    event_value?: any,
    interactive_id?: string,
    interactive_url?: string,
  ): LogMessage {

    const logMessage: LogMessage = {
      application: "Activity Player",
      username: this.username,
      role: this.role,
      classHash: this.classHash,
      session: this.session,
      appMode: this.appMode,
      sequence: this.sequence,
      sequenceActivityIndex: this.sequenceActivityIndex,
      activity: this.activity,
      activityPage: this.activityPage,
      time: Date.now(), // eventually we will want server skew (or to add this via FB directly)
      event,
      event_value,
      parameters,
      interactive_id,
      interactive_url,
      run_remote_endpoint: this.runRemoteEndpoint
    };

    return logMessage;
  }

  private sendToLoggingService(data: LogMessage) {
    if (DEBUG_LOGGER) {
      console.log("Logger#sendToLoggingService sending", JSON.stringify(data), "to", this.logManagerUrl);
    }
    const request = new XMLHttpRequest();
    request.open("POST", this.logManagerUrl, true);
    request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    request.send(JSON.stringify(data));
  }

  private async sendToLoggingServiceAndWaitForReply(data: LogMessage) {
    let logged = false;
    try {
      const result = await fetch(this.logManagerUrl, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {"Content-Type": "application/json; charset=UTF-8"}
      });
      logged = (result.status === 200) || (result.status === 201);
    } catch (e) {} // eslint-disable-line no-empty
    return logged;
  }

  private saveLogMessage(data: LogMessage) {
    dexieStorage.logs.put(data);
  }
}
