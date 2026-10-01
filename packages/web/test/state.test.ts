// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  clearCurrentUser,
  getCurrentUser,
  setCurrentUser,
} from "../src/state.js";

describe("current user session state", () => {
  afterEach(() => {
    clearCurrentUser();
  });

  it("returns null when nothing is stored", () => {
    expect(getCurrentUser()).toBeNull();
  });

  it("round-trips a stored user", () => {
    setCurrentUser({ userId: 42, displayName: "space_cadet" });
    expect(getCurrentUser()).toEqual({ userId: 42, displayName: "space_cadet" });
  });

  it("clearCurrentUser removes the stored user", () => {
    setCurrentUser({ userId: 1, displayName: "someone" });
    clearCurrentUser();
    expect(getCurrentUser()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    localStorage.setItem("3d-space-pong:user", "{not json");
    expect(getCurrentUser()).toBeNull();
  });

  it("returns null when the shape doesn't match (missing fields)", () => {
    localStorage.setItem("3d-space-pong:user", JSON.stringify({ userId: 1 }));
    expect(getCurrentUser()).toBeNull();
  });

  it("returns null when userId is the wrong type", () => {
    localStorage.setItem(
      "3d-space-pong:user",
      JSON.stringify({ userId: "42", displayName: "x" }),
    );
    expect(getCurrentUser()).toBeNull();
  });
});
