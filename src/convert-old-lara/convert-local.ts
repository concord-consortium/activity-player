import fs from "fs";
import { convertLegacyResource } from "./convert";

// for debugging use
(async function() {
  const resourceToConvert = process.argv.slice(2);
  const newResourceName = resourceToConvert[0].split("activity-")[1];
  const localDir = "../data/";
  const legacyResourcePath = localDir + resourceToConvert + ".json";
  const legacyRes = await import(legacyResourcePath);
  const r = convertLegacyResource(legacyRes);
  console.log(JSON.stringify(r));
  fs.writeFile (localDir+"version-2/sample-new-sections-"+newResourceName+".json", JSON.stringify(r), function(err) {
    if (err) throw err;
    console.log("complete");
    }
);
})();
