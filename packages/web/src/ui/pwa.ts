/**
 * PWA affordances beyond the manifest + service worker (vite.config.ts):
 *
 *   - Install button: Chromium fires `beforeinstallprompt` when the app is
 *     installable. We stash the event and let the menu mount an INSTALL
 *     button that replays it, instead of relying on the browser's easily
 *     missed omnibox icon.
 *   - iOS hint: Safari has no install prompt API, so on iOS (not already
 *     installed) the same button shows "Share → Add to Home Screen"
 *     instructions instead.
 *   - Offline pill: signup, match recording and the leaderboard need the
 *     API; 2P local and attract mode don't. A small status pill tells the
 *     player which is which while the device is offline.
 */
import { isInstalledDisplayMode } from "./fullscreen.js";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

function notifyInstallChange(): void {
  for (const fn of installListeners) fn();
}

function isIos(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Macintosh; tell it apart by touch support.
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

function isIosStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isInstalled(): boolean {
  return isInstalledDisplayMode() || isIosStandalone();
}

/** Call once at startup, before the first route renders. */
export function initPwa(): void {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // suppress the mini-infobar; we show our own button
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyInstallChange();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notifyInstallChange();
  });
  mountOfflinePill();
}

export interface InstallButtonHandle {
  destroy(): void;
}

/**
 * Mount an INSTALL button into `container`. It appears only when an
 * install path exists (Chromium prompt captured, or iOS Safari) and the
 * app isn't already running installed, and re-renders if installability
 * changes while mounted.
 */
export function mountInstallButton(container: HTMLElement): InstallButtonHandle {
  if (isInstalled()) return { destroy: () => {} };

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "fullscreen-toggle install-toggle";
  btn.dataset.action = "install";
  btn.setAttribute("aria-label", "Install app");
  btn.innerHTML = `
    <span class="fullscreen-icon" aria-hidden="true">⤓</span>
    <span class="fullscreen-label">INSTALL</span>
  `;

  const hint = document.createElement("div");
  hint.className = "install-hint";
  hint.setAttribute("role", "note");
  hint.hidden = true;
  hint.textContent =
    "To install: tap the Share button in Safari, then “Add to Home Screen”.";

  let rendered = false;
  const render = () => {
    // The menu re-renders itself wholesale (e.g. the sound toggle), which
    // detaches this button without calling destroy() — drop our listener.
    if (rendered && !btn.isConnected) {
      installListeners.delete(render);
      return;
    }
    rendered = true;
    const available = !!deferredPrompt || isIos();
    btn.hidden = !available || isInstalled();
    if (btn.hidden) hint.hidden = true;
  };

  const onClick = async (e: Event) => {
    e.preventDefault();
    if (deferredPrompt) {
      const evt = deferredPrompt;
      deferredPrompt = null; // a prompt event can only be used once
      await evt.prompt();
      await evt.userChoice.catch(() => undefined);
      notifyInstallChange();
    } else if (isIos()) {
      hint.hidden = !hint.hidden;
    }
  };

  btn.addEventListener("click", onClick);
  installListeners.add(render);
  render();
  container.prepend(btn);
  container.parentElement?.insertBefore(hint, container.nextSibling);

  return {
    destroy() {
      installListeners.delete(render);
      btn.removeEventListener("click", onClick);
      btn.remove();
      hint.remove();
    },
  };
}

function mountOfflinePill(): void {
  const pill = document.createElement("div");
  pill.className = "offline-pill";
  pill.setAttribute("role", "status");
  pill.textContent = "OFFLINE · 2P local still works";
  document.body.appendChild(pill);

  const update = () => pill.classList.toggle("visible", !navigator.onLine);
  update();
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
}
