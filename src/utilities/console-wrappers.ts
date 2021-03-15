/* eslint no-console: ["warn", { allow: ["log", "error", "warn", "info", "dir", "group", "groupEnd"] }] */

export const consoleLog = (...args: any) => console.log(...args);

export const consoleError = (...args: any) => console.error(...args);

export const consoleWarn = (...args: any) => console.warn(...args);

export const consoleInfo = (...args: any) => console.info(...args);

export const consoleDir = (...args: any) => console.dir(...args);

export const consoleGroup = (...args: any) => console.group(...args);

export const consoleGroupEnd = () => console.groupEnd();
