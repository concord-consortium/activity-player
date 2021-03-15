import { consoleInfo } from "../utilities/console-wrappers";

const debug = (window.localStorage ? window.localStorage.getItem("debug") : undefined) || "";
if (debug.length > 0) {
  consoleInfo("DEBUG:", debug);
}

const debugContains = (key: string) => debug.indexOf(key) !== -1;

export const DEBUG_LOGGER = debugContains("logger");
