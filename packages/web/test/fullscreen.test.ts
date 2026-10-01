// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  isFullscreenSupported,
  isInstalledDisplayMode,
  isPortrait,
  isTouchDevice,
} from "../src/ui/fullscreen.js";

describe("isTouchDevice", () => {
  const originalMaxTouchPoints = navigator.maxTouchPoints;
  // jsdom defines `ontouchstart` on window (as part of its touch-event
  // support) regardless of whether the "device" is touch-capable, so the
  // "no touch" case has to remove it explicitly to simulate a real desktop
  // browser where the property is absent.
  const hadOnTouchStart = "ontouchstart" in window;

  afterEach(() => {
    Object.defineProperty(navigator, "maxTouchPoints", {
      value: originalMaxTouchPoints,
      configurable: true,
    });
    if (hadOnTouchStart) {
      (window as unknown as { ontouchstart?: unknown }).ontouchstart = null;
    }
  });

  it("is false when maxTouchPoints is 0 and ontouchstart is absent", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 0, configurable: true });
    delete (window as unknown as { ontouchstart?: unknown }).ontouchstart;
    expect(isTouchDevice()).toBe(false);
  });

  it("is true when maxTouchPoints is > 0", () => {
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    expect(isTouchDevice()).toBe(true);
  });
});

describe("isPortrait", () => {
  afterEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 768, configurable: true });
  });

  it("is true when height exceeds width", () => {
    Object.defineProperty(window, "innerWidth", { value: 400, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    expect(isPortrait()).toBe(true);
  });

  it("is false when width exceeds height", () => {
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 400, configurable: true });
    expect(isPortrait()).toBe(false);
  });
});

describe("isFullscreenSupported", () => {
  it("is true when document.documentElement.requestFullscreen exists", () => {
    // jsdom's Document doesn't implement the Fullscreen API by default;
    // this exercises the `typeof ... === "function"` fallback branch.
    (document.documentElement as unknown as { requestFullscreen: () => void }).requestFullscreen =
      () => {};
    expect(isFullscreenSupported()).toBe(true);
  });
});

describe("isInstalledDisplayMode", () => {
  afterEach(() => {
    // @ts-expect-error -- cleaning up our test stub
    delete window.matchMedia;
  });

  it("is false when matchMedia is unavailable", () => {
    // @ts-expect-error -- simulating an older browser
    delete window.matchMedia;
    expect(isInstalledDisplayMode()).toBe(false);
  });

  it("is true when display-mode: standalone matches", () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes("standalone"),
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    expect(isInstalledDisplayMode()).toBe(true);
  });

  it("is false when neither fullscreen nor standalone display-mode matches", () => {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    expect(isInstalledDisplayMode()).toBe(false);
  });
});
