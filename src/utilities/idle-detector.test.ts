import { IdleDetector } from "./idle-detector";

const idleTime = 3;

describe("IdleDetector", () => {
  it("detects idle user and calls onIdle", (done) => {
    const onIdle = jest.fn();
    const onActive = jest.fn();
    const id = new IdleDetector({ idle: idleTime, onIdle, onActive });
    id.start();

    setTimeout(() => {
      expect(onIdle).toHaveBeenCalled();
      done();
    }, idleTime + 1);
  });

  it("detects user actions user and doesn't call onIdle", (done) => {
    const onIdle = jest.fn();
    const onActive = jest.fn();
    const id = new IdleDetector({ idle: idleTime, onIdle, onActive });
    id.start();

    setTimeout(() => {
      window.dispatchEvent(new Event("mousemove"));
    }, idleTime - 1);

    setTimeout(() => {
      expect(onIdle).not.toHaveBeenCalled();
      done();
    }, idleTime + 1);
  });

  it("calls onActive after user has been idle and active again", (done) => {
    const onIdle = jest.fn();
    const onActive = jest.fn();
    const id = new IdleDetector({ idle: idleTime, onIdle, onActive });
    id.start();

    setTimeout(() => {
      expect(onIdle).toHaveBeenCalled();
      expect(onActive).not.toHaveBeenCalled();
      
      window.dispatchEvent(new Event("mousemove"));
    }, idleTime + 1);

    setTimeout(() => {
      expect(onActive).toHaveBeenCalled();
      done();
    }, idleTime + 2);
  });
});
