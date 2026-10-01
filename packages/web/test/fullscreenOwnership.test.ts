// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Fake Fullscreen API: jsdom has none. requestFullscreen/exitFullscreen flip
// document.fullscreenElement and dispatch fullscreenchange like a browser.
function installFakeFullscreen() {
  let element: Element | null = null;
  Object.defineProperty(document, "fullscreenElement", {
    get: () => element,
    configurable: true,
  });
  Object.defineProperty(document, "fullscreenEnabled", { value: true, configurable: true });
  document.documentElement.requestFullscreen = vi.fn(async () => {
    element = document.documentElement;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  document.exitFullscreen = vi.fn(async () => {
    element = null;
    document.dispatchEvent(new Event("fullscreenchange"));
  });
  return {
    /** Simulate the player pressing Escape / the browser dropping fullscreen. */
    dropExternally() {
      element = null;
      document.dispatchEvent(new Event("fullscreenchange"));
    },
  };
}

async function load() {
  vi.resetModules();
  return import("../src/ui/fullscreen.js");
}

describe("fullscreen ownership (task 847)", () => {
  let fake: ReturnType<typeof installFakeFullscreen>;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    fake = installFakeFullscreen();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function run<T>(p: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync();
    return p;
  }

  it("keeps player-chosen fullscreen when a match ends", async () => {
    const fs = await load();
    await run(fs.toggleFullscreen());
    expect(fs.isFullscreenActive()).toBe(true);
    expect(fs.isFullscreenAutoEntered()).toBe(false);

    await run(fs.enterGameplayViewport());
    await fs.leaveGameplayViewport();
    expect(fs.isFullscreenActive()).toBe(true);
    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });

  it("releases fullscreen the match entered for itself", async () => {
    const fs = await load();
    await run(fs.enterGameplayViewport());
    expect(fs.isFullscreenAutoEntered()).toBe(true);

    await fs.leaveGameplayViewport();
    expect(fs.isFullscreenActive()).toBe(false);
  });

  it("marks automatic fullscreen before fullscreenchange fires", async () => {
    const fs = await load();
    const seen: boolean[] = [];
    document.addEventListener("fullscreenchange", () => seen.push(fs.isFullscreenAutoEntered()), {
      once: true,
    });
    await run(fs.enterGameplayViewport());
    expect(seen).toEqual([true]);
  });

  it("forgets automatic ownership once fullscreen is dropped externally", async () => {
    const fs = await load();
    await run(fs.enterGameplayViewport());
    fake.dropExternally();
    await run(fs.toggleFullscreen());
    expect(fs.isFullscreenAutoEntered()).toBe(false);
  });
});
