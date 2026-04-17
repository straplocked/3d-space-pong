/**
 * Unified input — keyboard for desktop, touch-drag for mobile.
 *
 *   P1 keyboard: W (up) / S (down)
 *   P2 keyboard: ArrowUp / ArrowDown
 *   Pause:       Escape (both modes)
 *
 *   Mobile / touch: touching and dragging anywhere on the canvas maps
 *   the finger Y to the human paddle Y. Works for 1P vs AI on phones.
 *
 * Keyboard state is polled each frame (tracked in a Set). Touch state is
 * stored as a normalized 0..1 Y coordinate (0 = top of viewport).
 * Escape is edge-triggered: the game asks `consumeEscape()` once per frame
 * and the Input resets the flag so a single press fires a single action.
 */
export class Input {
  private keys = new Set<string>();
  private escapePressed = false;
  private touchY: number | null = null;

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.code);
    if (e.code === "Escape") {
      this.escapePressed = true;
    }
    // Prevent page scroll on keys we care about.
    if (
      e.code === "ArrowUp" ||
      e.code === "ArrowDown" ||
      e.code === "Space"
    ) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  /**
   * Should this touch be routed to paddle control, or is it hitting a
   * UI element (button / input / link) that needs its click?
   *
   * The window-level listeners see *every* touch on the page, including
   * ones that land on the pause overlay and the HUD pause button. If we
   * call preventDefault on those, mobile browsers cancel the subsequent
   * synthetic click — which is why the pause overlay's Resume/Quit
   * buttons became untappable on mobile.
   */
  private isUiTouch(e: TouchEvent): boolean {
    const target = e.target as Element | null;
    if (!target || typeof target.closest !== "function") return false;
    return !!target.closest(
      'button, a, input, select, textarea, [role="button"], [data-ui]',
    );
  }

  private onTouchStart = (e: TouchEvent) => {
    if (this.isUiTouch(e)) return; // let the UI handle it normally
    if (e.touches.length > 0) {
      const t = e.touches[0]!;
      this.touchY = t.clientY / window.innerHeight;
      e.preventDefault();
    }
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.isUiTouch(e)) return;
    if (e.touches.length > 0) {
      const t = e.touches[0]!;
      this.touchY = t.clientY / window.innerHeight;
      e.preventDefault();
    }
  };

  private onTouchEnd = (e: TouchEvent) => {
    if (e.touches.length === 0) {
      this.touchY = null;
    }
  };

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("touchstart", this.onTouchStart, {
      passive: false,
    });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
    window.addEventListener("touchend", this.onTouchEnd);
    window.addEventListener("touchcancel", this.onTouchEnd);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("touchstart", this.onTouchStart);
    window.removeEventListener("touchmove", this.onTouchMove);
    window.removeEventListener("touchend", this.onTouchEnd);
    window.removeEventListener("touchcancel", this.onTouchEnd);
    this.keys.clear();
    this.escapePressed = false;
    this.touchY = null;
  }

  /** Returns -1, 0, or +1 for player 1 vertical movement (keyboard). */
  player1Axis(): number {
    let v = 0;
    if (this.keys.has("KeyW")) v -= 1;
    if (this.keys.has("KeyS")) v += 1;
    return v;
  }

  /** Returns -1, 0, or +1 for player 2 vertical movement (keyboard). */
  player2Axis(): number {
    let v = 0;
    if (this.keys.has("ArrowUp")) v -= 1;
    if (this.keys.has("ArrowDown")) v += 1;
    return v;
  }

  /**
   * Touch Y normalized to 0..1 from top of viewport, or null if no touch
   * is currently active. Used by PongGame to directly set the human paddle
   * Y on mobile.
   */
  getTouchY(): number | null {
    return this.touchY;
  }

  /**
   * Returns true and clears the flag if Escape was pressed since the last
   * check. Edge-triggered so one keypress produces one pause toggle.
   */
  consumeEscape(): boolean {
    if (this.escapePressed) {
      this.escapePressed = false;
      return true;
    }
    return false;
  }
}
