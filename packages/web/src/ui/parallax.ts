import Parallax from "parallax-js";

let instance: Parallax | null = null;

/**
 * Initialise parallax.js on the global background element.
 * Idempotent — calling twice is a no-op.
 */
export function initParallax(): void {
  if (instance) return;
  const el = document.getElementById("parallax-bg");
  if (!el) return;

  instance = new Parallax(el, {
    relativeInput: true,
    hoverOnly: false,
    pointerEvents: false,
    precision: 1,
    scalarX: 8,
    scalarY: 8,
  });
}

export function disableParallax(): void {
  instance?.disable();
}

export function enableParallax(): void {
  instance?.enable();
}
