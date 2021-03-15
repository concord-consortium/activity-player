import { consoleDir, consoleError, consoleGroup, consoleGroupEnd, consoleInfo, consoleLog, consoleWarn } from "./console-wrappers";

describe("console wrappers", () => {

  beforeEach(() => {
    (window as any).console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      group: jest.fn(),
      groupEnd: jest.fn(),
      dir: jest.fn()
    };
  });

  it("wraps console.log", () => {
    consoleLog("test");
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("wraps console.error", () => {
    consoleError("test");
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("wraps console.warn", () => {
    consoleWarn("test");
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it("wraps console.info", () => {
    consoleInfo("test");
    expect(console.info).toHaveBeenCalledTimes(1);
  });

  it("wraps console.dir", () => {
    consoleDir("test");
    expect(console.dir).toHaveBeenCalledTimes(1);
  });

  it("wraps console.group", () => {
    consoleGroup("test");
    expect(console.group).toHaveBeenCalledTimes(1);
  });

  it("wraps console.groupEnd", () => {
    consoleGroupEnd();
    expect(console.groupEnd).toHaveBeenCalledTimes(1);
  });

});
