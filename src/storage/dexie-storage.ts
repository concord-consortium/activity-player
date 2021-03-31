import Dexie from "dexie";
import { OfflineActivity, LogMessage } from "../types";
import { IIndexedDBAnswer } from "./storage-facade";

// We need to ensure a version match between data stored and exported
// version 5: switched from activity to resource_url field for identifying answer's activity
export const kOfflineAnswerSchemaVersion = 7;
export interface IDexiePluginRecord {
  pluginId: number,
  resourceUrl: string,
  state: string|null
}

// Copy and pasted from the example: https://dexie.org/docs/Typescript
export class DexieStorage extends Dexie {
  // Declare implicit table properties.
  // (just to inform Typescript. Instantiated by Dexie in stores() method)
  logs: Dexie.Table<LogMessage, number>;
  offlineActivities: Dexie.Table<OfflineActivity, string>;
  answers: Dexie.Table<IIndexedDBAnswer, string>; // number = type of the primary key
  savedPluginStates: Dexie.Table<IDexiePluginRecord, number>;

  constructor () {
    // the database was called ActivityPlayer, but changes to the offlineActivities
    // primary key required deleting that table to upgrade it, so renaming
    // the database was easier
    super("ActivityPlayerDb");
    this.version(kOfflineAnswerSchemaVersion).stores({
      logs: "++id, activity",
      answers: "id, resource_url, [resource_url+question_id]",
      savedPluginStates: "[resourceUrl+pluginId]",
      offlineActivities: "&resourceUrl"  // unique by resourceUrl
    });
  }
}

export const dexieStorage = new DexieStorage();
