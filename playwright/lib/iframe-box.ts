import type { Page } from "@playwright/test";

export interface IframeBox { x: number; width: number; height: number }

/**
 * The interactive's iframe box once it holds still for two frames, or null if it moved or was
 * replaced: after a settings change, the AP sizes it in more than one render.
 */
export async function settledIframeBox(page: Page): Promise<IframeBox | null> {
  return page.locator(".iframe-runtime iframe").evaluate(async iframe => {
    const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
    const before = iframe.getBoundingClientRect();
    await nextFrame();
    await nextFrame();
    const after = iframe.getBoundingClientRect();
    const still = iframe.isConnected && before.x === after.x && before.width === after.width &&
      before.height === after.height;
    return still ? { x: after.x, width: after.width, height: after.height } : null;
  });
}
