import { DataSyncTracker } from "./data-sync-tracker";
import { IPluginSyncRequestEventHandler, IPluginSyncUpdate, offPluginSyncRequest, onPluginSyncRequest } from "../lara-plugin/events";


interface ITimedResponse {fracInterval:number, state: IPluginSyncUpdate["status"]}

class FakePlugin {
  timedResponses: Array<ITimedResponse>;
  updateCallback: (update: IPluginSyncUpdate) => void;
  maxInterval: number;
  syncRecHandler: IPluginSyncRequestEventHandler;
  constructor(timedResponses: Array<ITimedResponse>) {
    this.timedResponses = timedResponses;
    this.syncRecHandler = (req) => {

      this.updateCallback = req.updateCallback;
      this.maxInterval = req.maxUpdateCallbackInterval;
      this.respond();
    };
    onPluginSyncRequest(this.syncRecHandler);
  }

  respond() {
    this.timedResponses.map( r => {
      window.setTimeout(() => {
        this.updateCallback({status: r.state});
      }, r.fracInterval * this.maxInterval);
    });
  }

  stopListening() {
    offPluginSyncRequest(this.syncRecHandler);
  }
}

describe("DataSyncTracker", () => {
  it("When no plugins answer the call", ()=> {
    const mySyncTracker = new DataSyncTracker(2,1);
    const pluginsDone =jest.spyOn(mySyncTracker,"pluginsDone");
    const receivedPluginStatus = jest.spyOn(mySyncTracker, "receivedPluginStatus");
    const syncTimeout = jest.spyOn(mySyncTracker,"syncTimeout");

    return mySyncTracker.start().then(() => {
      expect(pluginsDone).toBeCalledTimes(1);
      expect(receivedPluginStatus).not.toHaveBeenCalled();
      expect(syncTimeout).not.toHaveBeenCalled();
      expect(mySyncTracker.pluginSuccesses).toEqual(0);
      expect(mySyncTracker.pluginFailures).toEqual(0);
    });
  });


  it("When there are some plugins answering on time", () => {

    const happyPlugin = new FakePlugin([
      {fracInterval: 0.4, state: "started"},
      {fracInterval: 0.4, state: "working"},
      {fracInterval: 0.4, state: "working"},
      {fracInterval: 0.4, state: "completed"}
    ]);

    const sadPlugin = new FakePlugin([
      {fracInterval: 0.4, state: "started"},
      {fracInterval: 0.4, state: "working"},
      {fracInterval: 0.4, state: "working"},
      {fracInterval: 0.4, state: "completed"}
    ]);
    const promiseFunc = jest.fn();
    const myPromise:Promise<void> = new Promise( (resolve, reject) => {
      window.setTimeout(()=> {
        promiseFunc();
        resolve();
      }, 1);
    });
    const mySyncTracker = new DataSyncTracker(100,1);
    mySyncTracker.addPromise(myPromise);
    const pluginsDone =jest.spyOn(mySyncTracker,"pluginsDone");
    const receivedPluginStatus = jest.spyOn(mySyncTracker, "receivedPluginStatus");
    const syncTimeout = jest.spyOn(mySyncTracker,"syncTimeout");

    return mySyncTracker.start().then(() => {
      expect(pluginsDone).toBeCalledTimes(1);
      expect(receivedPluginStatus).toBeCalledTimes(8); // 4 happy, 4 sad
      expect(syncTimeout).not.toHaveBeenCalled();
      expect(mySyncTracker.pluginSuccesses).toEqual(1);
      expect(mySyncTracker.pluginFailures).toEqual(1);
      expect(mySyncTracker.pluginDrops).toEqual(0);
      expect(promiseFunc).toHaveBeenCalled();
      happyPlugin.stopListening();
      sadPlugin.stopListening();
    });
  });

  it("When some plugins are too slow in responding", () => {

    const slowPlugin = new FakePlugin([
      {fracInterval: 0.4, state: "started"},
      {fracInterval: 3, state: "failed"}
    ]);

    const sadPlugin = new FakePlugin([
      {fracInterval: 0.4, state: "started"},
      {fracInterval: 0.4, state: "failed"}
    ]);

    const mySyncTracker = new DataSyncTracker(10,1);
    // mySyncTracker.addPromise(myPromise);
    const pluginsDone =jest.spyOn(mySyncTracker,"pluginsDone");
    const receivedPluginStatus = jest.spyOn(mySyncTracker, "receivedPluginStatus");
    const syncTimeout = jest.spyOn(mySyncTracker,"syncTimeout");

    return mySyncTracker.start().then(() => {
      expect(pluginsDone).toBeCalledTimes(1);
      expect(syncTimeout).not.toHaveBeenCalled();
      expect(receivedPluginStatus).toBeCalledTimes(3); // 1 slow, 2 sad
      expect(mySyncTracker.pluginSuccesses).toEqual(0);
      expect(mySyncTracker.pluginDrops).toEqual(1);
      expect(mySyncTracker.pluginFailures).toEqual(1);
      slowPlugin.stopListening();
      sadPlugin.stopListening();
    });
  });

  it("When a promise takes too long", () => {

    const mySyncTracker = new DataSyncTracker(2,1);
    const myPromise:Promise<void> = new Promise( (resolve) => {
      window.setTimeout(()=> {
        resolve();
      }, 3000);
    });
    mySyncTracker.addPromise(myPromise);
    return mySyncTracker.start()
      .then()
      .catch((error) => {
        expect(error).toMatch(/TimeOut/);
      });
  });
});



