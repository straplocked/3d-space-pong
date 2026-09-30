/**
 * Unified input — keyboard for desktop, touch-drag for mobile.
 *
 *   P1 keyboard: W (up) / S (down)
 *   P2 keyboard: ArrowUp / ArrowDown
 *   Pause:       Escape (both modes)
 *
 *   Mobile / touch, 1P vs AI: touching and dragging anywhere on the canvas
 *   maps the finger Y to the human paddle Y.
 *
 *   Mobile / touch, 2P local: each active touch is bucketed by which half
 *   of the screen it started on — left half drags the left paddle, right
 *   half drags the right paddle — so two thumbs can each own a side.
 *
 * Keyboard state is polled each frame (tracked in a Set). Touch state is
 * tracked per active touch (by identifier) as {x, normalized-0..1 y}, so
 * multiple simultaneous touches can be told apart by screen half.
 * Escape is edge-triggered: the game asks `consumeEscape()` once per frame
 * and the Input resets the flag so a single press fires a single action.
 */
export class Input {
  private keys = new Set<string>();
  private escapePressed = false;
  private touches = new Map<number, { x: number; y: number }>();

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
    for (const t of Array.from(e.changedTouches)) {
      this.touches.set(t.identifier, {
        x: t.clientX,
        y: t.clientY / window.innerHeight,
      });
    }
    e.preventDefault();
  };

  private onTouchMove = (e: TouchEvent) => {
    if (this.isUiTouch(e)) return;
    for (const t of Array.from(e.changedTouches)) {
      if (this.touches.has(t.identifier)) {
        this.touches.set(t.identifier, {
          x: t.clientX,
          y: t.clientY / window.innerHeight,
        });
      }
    }
    e.preventDefault();
  };

  private onTouchEnd = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      this.touches.delete(t.identifier);
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
    this.touches.clear();
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
   * Touch Y normalized to 0..1 from top of viewport, from whichever touch
   * is currently active (first one tracked), or null if none. Used for 1P
   * vs AI, where dragging anywhere on screen controls the one human paddle.
   */
  getTouchY(): number | null {
    const first = this.touches.values().next();
    return first.done ? null : first.value.y;
  }

  /**
   * Touch Y normalized to 0..1, restricted to touches that started on the
   * given screen half — `"left"` for x < innerWidth/2, `"right"` otherwise.
   * Used for 2P local so each player's thumb only drives their own paddle.
   * Returns null if no matching touch is currently active.
   */
  getTouchYForSide(side: "left" | "right"): number | null {
    const halfW = window.innerWidth / 2;
    let result: number | null = null;
    for (const t of this.touches.values()) {
      const onLeft = t.x < halfW;
      if ((side === "left") === onLeft) {
        result = t.y;
      }
    }
    return result;
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
