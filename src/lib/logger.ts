import { v4 as uuid } from "uuid";
import { DEBUG_LOGGER } from "../lib/debug";
import { LaraGlobalType } from "../lara-plugin/index";
import { Role } from "../student-info";
import { dexieStorage } from "../storage/dexie-storage";
import { LogMessage } from "../types";
import { consoleLog } from "../utilities/console-wrappers";

const logManagerUrl = "//cc-log-manager.herokuapp.com/api/logs";

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

export class Logger {
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
      consoleLog("Logger#initializeLogger called.");
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
      consoleLog("Logger#sendToLoggingService sending", JSON.stringify(data), "to", logManagerUrl);
    }
    const request = new XMLHttpRequest();
    request.open("POST", logManagerUrl, true);
    request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
    request.send(JSON.stringify(data));
  }

  private saveLogMessage(data: LogMessage) {
    dexieStorage.logs.put(data);
  }

}
