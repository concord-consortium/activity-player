import { emitPluginSyncRequest, IPluginSyncUpdate } from "../lara-plugin/events";
import { ILogSyncUpdate, Logger } from "../lib/logger";

const KDefaultSyncTimeoutSeconds = 60 * 60; // 1 hour save timeout
const KDefaultPluginHeartbeatSeconds =  10; // 10 seconds before we give up

// We save: Logs, student data, plugin data, and also ask plugins to save
export class DataSyncTracker {
  pluginTimeoutS: number; // Seconds
  syncTimeoutS: number;   // Seconds
  startTimeMs: number;    // Millies
  pluginPromise: Promise<void>;
  promiseResolver: (result?:any)=>void|null;
  promiseRejector: (reason: any)=>void;
  pluginFailures: number;
  pluginSuccesses: number;
  pluginDrops: number;
  pendingPromises: Array<Promise<number|void>>;
  timeoutRef: number
  logsSynced: boolean;

  constructor(
    syncTimeoutS: number = KDefaultSyncTimeoutSeconds,
    pluginTimeoutS: number = KDefaultPluginHeartbeatSeconds) {
      this.syncTimeoutS = syncTimeoutS;
      this.pluginTimeoutS = pluginTimeoutS;
      this.pendingPromises = [];
      this.pluginFailures = 0;
      this.pluginSuccesses = 0;
      this.pluginDrops = 0;
      this.logsSynced = false;

      this.receivedLoggerStatus = this.receivedLoggerStatus.bind(this);
  }

  start() {
    this.startTimeMs = Date.now();
    emitPluginSyncRequest({
      maxUpdateCallbackInterval: this.pluginTimeoutS * 1000,
      updateCallback: (status:IPluginSyncUpdate) => this.receivedPluginStatus(status)
    });

    this.pluginPromise = new Promise((resolve, reject) => {
      this.promiseResolver = resolve;
      this.promiseRejector = reject;
    });

    this.pendingPromises=[this.pluginPromise];
    this.registerTimeOut();
    this.registerSyncTimeOut();

    Logger.syncOfflineLogs(this.receivedLoggerStatus);

    return this.finish();
  }

  addPromise(promise: Promise<number|void>) {
    this.pendingPromises.push(promise);
  }

  registerSyncTimeOut() {
    window.setTimeout(() => this.syncTimeout(), this.syncTimeoutS * 1000);
  }

  registerTimeOut() {
    if(this.timeoutRef) { window.clearTimeout(this.timeoutRef); }
    this.timeoutRef = window.setTimeout(() => this.syncDone(), this.pluginTimeoutS * 1000);
  }

  syncTimeout() {
    this.promiseRejector("Sync operation TimeOut");
  }

  // We call this when we stop hearing from any plugins and the logger:
  syncDone() {
    // Resolve our internal promise:
    this.promiseResolver();
  }

  finish():Promise<boolean> {
    return Promise.all(this.pendingPromises).then(() => {
      const endTimeMs = Date.now();
      const elapsedMs = endTimeMs - this.startTimeMs;
      const elapsedS = elapsedMs / 1000;
      console.info(`sync finished in ${elapsedS} seconds`);
      return true;
    });
  }

  receivedPluginStatus(status: IPluginSyncUpdate) {
    // We don't reset the timer if the status is fail or ok, which are terminal.
    if(status.status===("started" || "working")) {
      if(status.status === "started") {
        this.pluginDrops++;
      }
      this.registerTimeOut();
    }
    if(status.status === "completed")   {
      this.pluginSuccesses++;
      this.pluginDrops--;
    }
    if(status.status === "failed") {
      this.pluginFailures++;
      this.pluginDrops--;
    }
  }

  receivedLoggerStatus(status: ILogSyncUpdate) {
    console.log(">==== LOGGER SYNC ==>", status);
    // We don't reset the timer if the status is fail or ok, which are terminal.
    if(status.status===("started" || "working")) {
      this.registerTimeOut();
    }
    if(status.status === "completed")   {
      this.logsSynced = true;
    }
    if(status.status === "failed") {
      this.logsSynced = false;
    }
  }
}
