// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Input } from "../src/game/Input.js";

function keyEvent(type: "keydown" | "keyup", code: string): KeyboardEvent {
  return new KeyboardEvent(type, { code });
}

describe("Input — keyboard axes", () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
    input.attach();
  });

  afterEach(() => {
    input.detach();
  });

  it("player1Axis is 0 with nothing held", () => {
    expect(input.player1Axis()).toBe(0);
  });

  it("player1Axis is -1 on W and +1 on S", () => {
    window.dispatchEvent(keyEvent("keydown", "KeyW"));
    expect(input.player1Axis()).toBe(-1);
    window.dispatchEvent(keyEvent("keyup", "KeyW"));

    window.dispatchEvent(keyEvent("keydown", "KeyS"));
    expect(input.player1Axis()).toBe(1);
  });

  it("player1Axis cancels out when both W and S are held", () => {
    window.dispatchEvent(keyEvent("keydown", "KeyW"));
    window.dispatchEvent(keyEvent("keydown", "KeyS"));
    expect(input.player1Axis()).toBe(0);
  });

  it("player2Axis is -1 on ArrowUp and +1 on ArrowDown", () => {
    window.dispatchEvent(keyEvent("keydown", "ArrowUp"));
    expect(input.player2Axis()).toBe(-1);
    window.dispatchEvent(keyEvent("keyup", "ArrowUp"));

    window.dispatchEvent(keyEvent("keydown", "ArrowDown"));
    expect(input.player2Axis()).toBe(1);
  });

  it("keyup clears the held key", () => {
    window.dispatchEvent(keyEvent("keydown", "KeyW"));
    expect(input.player1Axis()).toBe(-1);
    window.dispatchEvent(keyEvent("keyup", "KeyW"));
    expect(input.player1Axis()).toBe(0);
  });

  it("detach() clears tracked keys", () => {
    window.dispatchEvent(keyEvent("keydown", "KeyW"));
    input.detach();
    input.attach();
    expect(input.player1Axis()).toBe(0);
  });
});

describe("Input — escape edge trigger", () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
    input.attach();
  });

  afterEach(() => {
    input.detach();
  });

  it("consumeEscape() is false until Escape is pressed", () => {
    expect(input.consumeEscape()).toBe(false);
  });

  it("consumeEscape() returns true exactly once per press", () => {
    window.dispatchEvent(keyEvent("keydown", "Escape"));
    expect(input.consumeEscape()).toBe(true);
    expect(input.consumeEscape()).toBe(false);
  });
});

describe("Input — touch tracking", () => {
  let input: Input;

  beforeEach(() => {
    input = new Input();
    input.attach();
    Object.defineProperty(window, "innerHeight", { value: 1000, configurable: true });
    Object.defineProperty(window, "innerWidth", { value: 800, configurable: true });
  });

  afterEach(() => {
    input.detach();
  });

  // Touch handlers are wired as private fields but, since this is plain JS
  // at runtime (no `#` private fields), we can drive them directly with a
  // minimal event shape rather than constructing real TouchEvent/Touch
  // objects (which jsdom doesn't implement).
  function fakeTouchEvent(touches: Array<{ identifier: number; clientX: number; clientY: number }>) {
    return {
      target: document.body,
      changedTouches: touches,
      preventDefault: () => {},
    } as unknown as TouchEvent;
  }

  it("getTouchY() is null with no active touch", () => {
    expect(input.getTouchY()).toBeNull();
  });

  it("tracks a touch start and reports normalized Y", () => {
    const anyInput = input as unknown as {
      onTouchStart: (e: TouchEvent) => void;
    };
    anyInput.onTouchStart(fakeTouchEvent([{ identifier: 1, clientX: 100, clientY: 500 }]));
    expect(input.getTouchY()).toBeCloseTo(0.5);
  });

  it("updates Y on touch move for a tracked touch", () => {
    const anyInput = input as unknown as {
      onTouchStart: (e: TouchEvent) => void;
      onTouchMove: (e: TouchEvent) => void;
    };
    anyInput.onTouchStart(fakeTouchEvent([{ identifier: 1, clientX: 100, clientY: 0 }]));
    anyInput.onTouchMove(fakeTouchEvent([{ identifier: 1, clientX: 100, clientY: 900 }]));
    expect(input.getTouchY()).toBeCloseTo(0.9);
  });

  it("clears a touch on touch end", () => {
    const anyInput = input as unknown as {
      onTouchStart: (e: TouchEvent) => void;
      onTouchEnd: (e: TouchEvent) => void;
    };
    anyInput.onTouchStart(fakeTouchEvent([{ identifier: 1, clientX: 100, clientY: 500 }]));
    anyInput.onTouchEnd(fakeTouchEvent([{ identifier: 1, clientX: 100, clientY: 500 }]));
    expect(input.getTouchY()).toBeNull();
  });

  it("getTouchYForSide buckets touches by screen half", () => {
    const anyInput = input as unknown as {
      onTouchStart: (e: TouchEvent) => void;
    };
    // left half (x < 400)
    anyInput.onTouchStart(fakeTouchEvent([{ identifier: 1, clientX: 100, clientY: 200 }]));
    // right half (x >= 400)
    anyInput.onTouchStart(fakeTouchEvent([{ identifier: 2, clientX: 700, clientY: 800 }]));

    expect(input.getTouchYForSide("left")).toBeCloseTo(0.2);
    expect(input.getTouchYForSide("right")).toBeCloseTo(0.8);
  });
});
