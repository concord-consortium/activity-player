import Dexie from "dexie";
import { OfflineActivity } from "./types";
import { IIndexedDBAnswer, kOfflineAnswerSchemaVersion } from "./storage-facade";

// Copy and pasted from the example: https://dexie.org/docs/Typescript
export class DexieStorage extends Dexie {
  // Declare implicit table properties.
  // (just to inform Typescript. Instantiated by Dexie in stores() method)
  offlineActivities: Dexie.Table<OfflineActivity, string>;
  answers: Dexie.Table<IIndexedDBAnswer, string>; // number = type of the primkey
  //...other tables goes here...

  constructor () {
      super("ActivityPlayer");
      this.version(kOfflineAnswerSchemaVersion).stores({
          answers: "id, question_id, activity",
          //...other tables goes here...
      });
      this.version(3).stores({
        offlineActivities: "&url"  // unique by url
      });
  }
}

