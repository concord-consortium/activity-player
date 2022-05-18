import fs from "fs";
import { convertLegacyResource } from "./convert";

// for debugging use
(async function() {
  const resourceToConvert = process.argv.slice(2);
  const resourceType = resourceToConvert[0].includes("activity") ? "activity-" : "sequence-";
  const newResourceName = resourceToConvert[0].split(resourceType)[1];
  const localDir = "../data/";
  const legacyResourcePath = localDir + resourceToConvert + ".json";
  const legacyRes = await import(legacyResourcePath);
  const r = convertLegacyResource(legacyRes);
  // tslint:disable-next-line:no-console
  console.log(JSON.stringify(r));
  fs.writeFile (localDir+"version-2/sample-new-sections-"+newResourceName+".json", JSON.stringify(r), function(err) {
    if (err) throw err;
    // tslint:disable-next-line:no-console
    console.log("complete");
    }
);
})();
