import { fireEvent } from "@testing-library/dom";
import { isNetworkConnected, monitorNetworkConnection } from "./network-connection";

describe("network-connection utils", () => {
  const {navigator} = window;

  beforeAll(() => {
    delete (window as any).navigator;
  });

  afterAll(() => {
    (window as any).navigator = navigator;
  });

  it("returns network connection status", () => {
    (window as any).navigator = {onLine: true};
    expect(isNetworkConnected()).toBe(true);

    (window as any).navigator = {onLine: false};
    expect(isNetworkConnected()).toBe(false);
  });

  it("monitors network connection status", () => {
    (window as any).navigator = {onLine: true};

    const callback = jest.fn();
    let unmonitor = monitorNetworkConnection(callback);
    expect(callback).toBeCalledWith(true);

    jest.resetAllMocks();

    fireEvent(window, new Event("offline"));
    expect(callback).toBeCalledWith(false);

    jest.resetAllMocks();

    (window as any).navigator = {onLine: false};
    unmonitor();
    unmonitor = monitorNetworkConnection(callback);
    expect(callback).toBeCalledWith(false);

    jest.resetAllMocks();

    fireEvent(window, new Event("online"));
    expect(callback).toBeCalledWith(true);

    // test removing event listeners
    jest.resetAllMocks();
    unmonitor();
    fireEvent(window, new Event("online"));
    expect(callback).not.toBeCalled();
  });

});
