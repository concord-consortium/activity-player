import { v4 as uuid } from "uuid";
import { DEBUG_LOGGER } from "../lib/debug";
import { LaraGlobalType } from "../lara-plugin/index";

const logManagerUrl = "//cc-log-manager.herokuapp.com/api/logs";

interface LogMessage {
  application: string;
  run_remote_endpoint?: string;
  username: string;
  userType: string;
  classHash: string;
  session: string;
  appMode: string;
  sequence: string | undefined;
  activity: string;
  activityPage: number;
  time: number;
  event: string;
  event_value: any;
  parameters: any;
  interactive_id: string | undefined,
  interactive_url: string | undefined,
}

export enum LogEventName {
  CHANGE_ACTIVITY,
  CHANGE_ACTIVITY_PAGE,
  SHOW_SEQUENCE_INTRO_PAGE,
  TOGGLE_MODAL_DIALOG,
  IFRAME_INTERACTION,
  SHOW_SIDEBAR,
  TOGGLE_COLLAPSIBLE_COLUMN,
  CREATE_REPORT,
  TOGGLE_HINT,
}

export class Logger {
  public static initializeLogger(LARA: LaraGlobalType, username: string, userType: string, classHash: string, teacherEdition: boolean, sequence: string | undefined, activity: string, activityPage: number) {
    if (DEBUG_LOGGER) {
      console.log("Logger#initializeLogger called.");
    }
    this._instance = new Logger(LARA, username, userType, classHash, teacherEdition, sequence, activity, activityPage);
  }

  public static updateActivity(activity: string) {
    this._instance.activity = activity;
  }

  public static updateActivityPage(page: number) {
    this._instance.activityPage = page;
  }

  public static log(event: string | LogEventName, event_value?: any, parameters?: Record<string, unknown>, interactive_id?: string, interactive_url?: string) {
    if (!this._instance) return;
    const eventString = typeof event === "string" ? event : LogEventName[event];
    const logMessage = Logger.Instance.createLogMessage(eventString, event_value, parameters, interactive_id, interactive_url);
    this._instance.LARA.Events.emitLog(logMessage);
    sendToLoggingService(logMessage);
  }

  private static _instance: Logger;

  public static get Instance() {
    if (this._instance) {
      return this._instance;
    }
    throw new Error("Logger not initialized yet.");
  }

  private LARA: LaraGlobalType;
  private username: string;
  private userType: string;
  private classHash: string;
  private session: string;
  private appMode: string;
  private sequence: string | undefined;
  private activity: string;
  private activityPage: number;

  private constructor(LARA: LaraGlobalType, username: string, userType: string, classHash: string, teacherEdition: boolean, sequence: string | undefined, activity: string, activityPage: number) {
    this.LARA = LARA;
    this.session = uuid();
    this.username = username;
    this.userType = userType;
    this.classHash= classHash;
    this.appMode = teacherEdition ? "teacher edition" : "";
    this.sequence = sequence;
    this.activity = activity;
    this.activityPage = activityPage;
  }

  private createLogMessage(
    event: string,
    event_value?: any,
    parameters?: Record<string, unknown>,
    interactive_id?: string,
    interactive_url?: string,
  ): LogMessage {

    const logMessage: LogMessage = {
      application: "Activity Player",
      username: this.username,
      userType: this.userType,
      classHash: this.classHash,
      session: this.session,
      appMode: this.appMode,
      sequence: this.sequence,
      activity: this.activity,
      activityPage: this.activityPage,
      time: Date.now(), // eventually we will want server skew (or to add this via FB directly)
      event,
      event_value,
      parameters,
      interactive_id,
      interactive_url,
    };

    // WTD
    // if (user.loggingRemoteEndpoint) {
    //   logMessage.run_remote_endpoint = user.loggingRemoteEndpoint;
    // }

    return logMessage;
  }

}

function sendToLoggingService(data: LogMessage) {
  if (DEBUG_LOGGER) {
    console.log("Logger#sendToLoggingService sending", JSON.stringify(data), "to", logManagerUrl);
  }
  const request = new XMLHttpRequest();
  request.open("POST", logManagerUrl, true);
  request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
  request.send(JSON.stringify(data));
}
