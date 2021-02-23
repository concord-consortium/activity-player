import Dexie from "dexie";
import { OfflineActivity, IExportableAnswerMetadata } from "./types";

// Copy and pasted from the example: https://dexie.org/docs/Typescript
export class DexieStorage extends Dexie {
  // Declare implicit table properties.
  // (just to inform Typescript. Instantiated by Dexie in stores() method)
  answers: Dexie.Table<IExportableAnswerMetadata, string>; // number = type of the primkey
  offlineActivities: Dexie.Table<OfflineActivity, string>;
  //...other tables goes here...

  constructor () {
      super("ActivityPlayer");
      this.version(2).stores({
          answers: "id, question_id, question_type",
          //...other tables goes here...
      });
      this.version(3).stores({
        offlineActivities: "&url"  // unique by url
      });
  }
}

