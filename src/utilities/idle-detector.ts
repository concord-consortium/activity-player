// This helper is based on: https://www.npmjs.com/package/idle-js
// All the functionality and options should be supported.
// However, it's been cleaned up and rewritten in TypeScript.
// PJ 01/25/2020: It happened as I thought it'd be possible to add iframe support, but I was wrong. Still, the library 
// is small enough and it's not actively developed, so I think it makes sense to have an own TS copy anyway.
type EventHandler = () => void;

interface IOptions {
  idle?: number; // idle time in ms
  events?: string[]; // events that will trigger the idle resetter
  onIdle?: EventHandler; // callback function to be executed after idle time
  onActive?: EventHandler; // callback function to be executed after back form idleness
  onHide?: EventHandler; // callback function to be executed when window become hidden
  onShow?: EventHandler; // callback function to be executed when window become visible
  keepTracking?: boolean; // set it to false of you want to track only once
  startAtIdle?: boolean; // set it to true if you want to start in the idle state
  recurIdleCall?: boolean;
}

const bulkAddEventListener = (object: any, events: string[], callback: EventHandler) => {
  events.forEach(function (event) {
    object.addEventListener(event, callback, true);
  });
};

const bulkRemoveEventListener = (object: any, events: string[], callback: EventHandler) => {
  events.forEach(function (event) {
    object.removeEventListener(event, callback, true);
  });
};

const visibilityEvents = ["visibilitychange", "webkitvisibilitychange", "mozvisibilitychange", "msvisibilitychange"];

const defaultOptions: IOptions = {
  idle: 10000, // idle time in ms
  events: ["mousemove", "keydown", "mousedown", "touchstart", "scroll"], // events that will trigger the idle resetter
  onIdle: undefined, // callback function to be executed after idle time
  onActive: undefined, // callback function to be executed after back form idleness
  onHide: undefined, // callback function to be executed when window become hidden
  onShow: undefined, // callback function to be executed when window become visible
  keepTracking: true, // set it to false of you want to track only once
  startAtIdle: false, // set it to true if you want to start in the idle state
  recurIdleCall: false
};

export class IdleDetector {
  public settings: IOptions;
  public visible: boolean;
  public idle: boolean;
  public clearTimeout: (() => void) | null = null;

  constructor(options: IOptions) {
    this.settings = { ...defaultOptions, ...options };
    this.reset();
  }

  private idlenessEventsHandler = () => {
    if (this.idle) {
      this.idle = false;
      this.settings.onActive?.();
    }
    this.resetTimeout();
  }

  private visibilityEventsHandler = () => {
    if (document.hidden || (document as any).webkitHidden || (document as any).mozHidden || (document as any).msHidden) {
      if (this.visible) {
        this.visible = false;
        this.settings.onHide?.();
      }
    } else {
      if (!this.visible) {
        this.visible = true;
        this.settings.onShow?.();
      }
    }
  }

  private resetTimeout(keepTracking = this.settings.keepTracking) {
    if (this.clearTimeout) {
      this.clearTimeout();
      this.clearTimeout = null;
    }
    if (keepTracking) {
      this.timeout();
    }
  }

  private timeout() {
    const timer = (this.settings.recurIdleCall) ? {
      set: setInterval.bind(window),
      clear: clearInterval.bind(window),
    } : {
        set: setTimeout.bind(window),
        clear: clearTimeout.bind(window),
      };

    const id = timer.set(() => {
      this.idle = true;
      this.settings.onIdle?.();
    }, this.settings.idle);

    this.clearTimeout = () => timer.clear(id);
  }

  public start() {
    this.timeout();

    bulkAddEventListener(window, this.settings.events || [], this.idlenessEventsHandler);

    if (this.settings.onShow || this.settings.onHide) {
      bulkAddEventListener(document, visibilityEvents, this.visibilityEventsHandler);
    }

    return this;
  }

  public stop() {
    bulkRemoveEventListener(window, this.settings.events || [], this.idlenessEventsHandler);
    this.resetTimeout(false);

    if (this.settings.onShow || this.settings.onHide) {
      bulkRemoveEventListener(document, visibilityEvents, this.visibilityEventsHandler);
    }

    return this;
  }

  public registerAction() {
    this.idlenessEventsHandler();
  }

  public reset() {
    this.idle = !!this.settings.startAtIdle;
    this.visible = !this.settings.startAtIdle;
    return this;
  }
}
