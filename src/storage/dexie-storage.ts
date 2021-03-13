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
      // FIXME: There is only one version for the whole database.
      // calling version multiple times is how you can specify a schema for older
      // versions of the database.
      this.version(5).stores({
        logs: "++id, activity"
      });
      this.version(kOfflineAnswerSchemaVersion).stores({
          answers: "id, resource_url, [resource_url+question_id]",
          pluginStates: "&pluginId"
      });
      this.version(3).stores({
        offlineActivities: "&resourceUrl"  // unique by resourceUrl
      });

      // Once we fix the version issue, the following code can be used
      // to clear the old tables since we don't need to worry about
      // about the old data. I'm not sure what the return value should
      // be to the upgrade callback
      // .upgrade(tx => {
      //   return tx.table("offlineActivities").toCollection().delete();
      // });
  }
}

export const dexieStorage = new DexieStorage();
