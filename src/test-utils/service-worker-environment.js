// Jest 26 and lower does not support transforming environment files
// It was fixed here:
//   https://github.com/facebook/jest/pull/8751
// And should be released in Jest 27.
// In the meantime we have to use common js and no typing

// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeEnvironment = require("jest-environment-node");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const makeServiceWorkerEnv = require("service-worker-mock");

class ServiceWorkerEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    const serviceWorkerEnv = makeServiceWorkerEnv();
    Object.assign(this.global, serviceWorkerEnv);
  }

  async teardown() {
    // TODO remove the stuff makeServiceWorkerEnv added
    await super.teardown();
  }
}

module.exports = ServiceWorkerEnvironment;
