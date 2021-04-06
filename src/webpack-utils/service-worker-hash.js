const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

module.exports = (options, loaderContext) => {

  const filePath = path.join(__dirname, "../service-worker.ts");
  const hash = crypto.createHash("sha256");
  const serviceWorkerHash = hash
    .update(fs.readFileSync(filePath).toString())
    .digest("hex")
    .substr(0, 8);

  return {
    code: `module.exports = "${serviceWorkerHash}"`,
    dependencies: [
      filePath
    ]
  };
};
