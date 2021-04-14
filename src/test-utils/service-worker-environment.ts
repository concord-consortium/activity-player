// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeEnvironment = require("jest-environment-node");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const makeServiceWorkerEnv = require("service-worker-mock");

class TestEnvironment extends NodeEnvironment {
  constructor(config) {
    super(config);
  }

  async setup() {
    await super.setup();
    const serviceWorkerEnv = makeServiceWorkerEnv();
    Object.assign(this.global, serviceWorkerEnv);
  }

  async teardown() {
    // TODO remove the stuff makeServiceWorkerEnv added
    await super.teardown();
  }

  runScript(script) {
    return super.runScript(script);
  }
}

module.exports = TestEnvironment;
