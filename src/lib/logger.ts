import { v4 as uuid } from "uuid";
import { DEBUG_LOGGER } from "../lib/debug";
import { LaraGlobalType } from "../lara-plugin/index";

type LoggerEnvironment = "dev" | "production";

const logManagerUrl: Record<LoggerEnvironment, string> = {
  dev: "//cc-log-manager-dev.herokuapp.com/api/logs",
  production: "//cc-log-manager.herokuapp.com/api/logs"
};

export interface LogParams {
  event: string | LogEventName,
  event_value?: any,
  parameters?: any,
  interactive_id?: string | undefined,
  interactive_url?: string | undefined
}

interface LogMessage {
  application: string;
  run_remote_endpoint?: string;
  username: string;
  role: string;
  classHash: string;
  session: string;
  appMode: string;
  sequence: string | undefined;
  sequenceActivityIndex: number;
  activity: string | undefined,
  activityPage: number;
  url: string;
  time: number;
  event: string;
  event_value: any;
  parameters: any;
  interactive_id: string | undefined,
  interactive_url: string | undefined,
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

export interface ILoggerOptions {
  LARA: LaraGlobalType;
  username: string;
  role: string;
  classHash: string;
  teacherEdition: boolean;
  sequence: string | undefined;
  sequenceActivityIndex: number;
  activity: string | undefined;
  activityPage: number;
  runRemoteEndpoint: string;
  env: LoggerEnvironment;
}

export class Logger {
  public static initializeLogger(options: ILoggerOptions) {
    if (DEBUG_LOGGER) {
      console.log("Logger#initializeLogger called.");
    }
    this._instance = new Logger(options);
  }

  public static updateActivity(activity: string) {
    this._instance.activity = activity;
  }

  public static updateActivityPage(page: number) {
    this._instance.activityPage = page;
  }

  public static updateSequenceActivityindex(index: number) {
    this._instance.sequenceActivityIndex = index;
  }

  public static log(logParams: LogParams) {
    if (!this._instance) return;
    const { event, parameters, event_value, interactive_id, interactive_url  } = logParams;
    const eventString = typeof event === "string" ? event : LogEventName[event];
    const logMessage = Logger.Instance.createLogMessage(eventString, parameters, event_value, interactive_id, interactive_url);
    this._instance.LARA.Events.emitLog(logMessage);
    sendToLoggingService(logMessage, logManagerUrl[Logger.Instance.env]);
  }

  private static _instance: Logger;

  public static get Instance() {
    if (this._instance) {
      return this._instance;
    }
    throw new Error("Logger not initialized yet.");
  }

  public env: LoggerEnvironment;

  private LARA: LaraGlobalType;
  private username: string;
  private role: string;
  private classHash: string;
  private session: string;
  private appMode: string;
  private sequence: string | undefined;
  private sequenceActivityIndex: number;
  private activity: string | undefined;
  private activityPage: number;
  private runRemoteEndpoint: string;

  private constructor(options: ILoggerOptions) {
    const { LARA, username, role, classHash, teacherEdition, sequence, sequenceActivityIndex,
      activity, activityPage, runRemoteEndpoint, env } = options;
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
    this.env = env;
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
      url: window.location.href,
      event,
      event_value,
      parameters,
      interactive_id,
      interactive_url,
      run_remote_endpoint: this.runRemoteEndpoint
    };

    return logMessage;
  }

}

function sendToLoggingService(data: LogMessage, url: string) {
  if (DEBUG_LOGGER) {
    console.log("Logger#sendToLoggingService sending", JSON.stringify(data), "to", url);
  }
  const request = new XMLHttpRequest();
  request.open("POST", url, true);
  request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
  request.send(JSON.stringify(data));
}
