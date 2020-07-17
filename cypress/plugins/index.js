import codeCoverageTask from "@cypress/code-coverage/task";

export default (on, config) => {
  codeCoverageTask(on, config);
  return config;
};