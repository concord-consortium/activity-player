type Listener = (data?: any) => void;

interface IMockPhone {
  listeners: Record<string, Listener>;
}

const phones: Record<string, IMockPhone> = {};

/**
 * The iframe-phone connections a rendered page opens, keyed by iframe id (the item's ref_id), so a test can
 * send messages from any interactive on the page. Use it from a jest.mock factory with `jest.requireActual`.
 */
export const iframePhones = {
  /** Throws when the interactive has no phone or no listener for the message, so a missing link fails loudly. */
  dispatch: (iframeId: string, type: string, data?: any) => {
    const listener = phones[iframeId]?.listeners[type];
    if (!listener) throw new Error(`No "${type}" listener on the phone for ${iframeId}`);
    listener(data);
  },
  reset: () => Object.keys(phones).forEach(iframeId => delete phones[iframeId])
};

/** Connects each endpoint on the next tick, as iframe-phone does once the interactive says hello. */
export const iframePhoneMock = {
  ParentEndpoint: jest.fn((iframe: HTMLIFrameElement, afterConnected: () => void) => {
    const phone: IMockPhone = { listeners: {} };
    phones[iframe.id] = phone;
    setTimeout(() => afterConnected());
    return {
      post: () => undefined,
      addListener: (type: string, listener: Listener) => { phone.listeners[type] = listener; },
      removeListener: (type: string) => { delete phone.listeners[type]; },
      disconnect: () => undefined
    };
  })
};
