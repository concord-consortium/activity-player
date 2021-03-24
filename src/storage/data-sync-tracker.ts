import { emitPluginSyncRequest, IPluginSyncUpdate } from "../lara-plugin/events";

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

  constructor(
    syncTimeoutS: number = KDefaultSyncTimeoutSeconds,
    pluginTimeoutS: number = KDefaultPluginHeartbeatSeconds) {
      this.syncTimeoutS = syncTimeoutS;
      this.pluginTimeoutS = pluginTimeoutS;
      this.pendingPromises = [];
      this.pluginFailures = 0;
      this.pluginSuccesses = 0;
      this.pluginDrops = 0;
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
    this.registerPluginTimeOut();
    this.registerSyncTimeOut();
    return this.finish();
  }

  addPromise(promise: Promise<number|void>) {
    this.pendingPromises.push(promise);
  }

  registerSyncTimeOut() {
    window.setTimeout(() => this.syncTimeout(), this.syncTimeoutS * 1000);
  }

  registerPluginTimeOut() {
    if(this.timeoutRef) { window.clearTimeout(this.timeoutRef); }
    this.timeoutRef = window.setTimeout(() => this.pluginsDone(), this.pluginTimeoutS * 1000);
  }

  syncTimeout() {
    this.promiseRejector("Sync operation TimeOut");
  }
  // We call this when we stop hearing from any plugins:
  pluginsDone() {
    // Resolve our internal plugin promise:
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
      this.registerPluginTimeOut();
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
}
