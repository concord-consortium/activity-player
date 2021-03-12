import Dexie from "dexie";
import { OfflineActivity, LogMessage } from "../types";
import { IIndexedDBAnswer } from "./storage-facade";

// We need to ensure a version match between data stored and exported
export const kOfflineAnswerSchemaVersion = 4;

// Copy and pasted from the example: https://dexie.org/docs/Typescript
export class DexieStorage extends Dexie {
  // Declare implicit table properties.
  // (just to inform Typescript. Instantiated by Dexie in stores() method)
  logs: Dexie.Table<LogMessage, number>;
  offlineActivities: Dexie.Table<OfflineActivity, string>;
  answers: Dexie.Table<IIndexedDBAnswer, string>; // number = type of the primkey
  pluginStates: Dexie.Table<{pluginId: number, state: string|null}>;

  constructor () {
      super("ActivityPlayer");
      this.version(5).stores({
        logs: "++id, activity"
      });
      this.version(kOfflineAnswerSchemaVersion).stores({
          answers: "id, question_id, activity",
          pluginStates: "&pluginId"
      });
      this.version(3).stores({
        offlineActivities: "&url"  // unique by url
      });
  }
}

export const dexieStorage = new DexieStorage();
