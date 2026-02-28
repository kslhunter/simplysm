import { describe, it, expect, beforeEach } from "vitest";
import {
  registerDialog,
  unregisterDialog,
  getTopmostDialog,
} from "../../../src/components/disclosure/dialogZIndex";

describe("getTopmostDialog", () => {
  let el1: HTMLElement;
  let el2: HTMLElement;

  beforeEach(() => {
    el1 = document.createElement("div");
    el2 = document.createElement("div");
    // Clean up any leftover registrations
    unregisterDialog(el1);
    unregisterDialog(el2);
  });

  it("returns null when no dialogs are registered", () => {
    expect(getTopmostDialog()).toBeNull();
  });

  it("returns the only registered dialog", () => {
    registerDialog(el1);
    expect(getTopmostDialog()).toBe(el1);
    unregisterDialog(el1);
  });

  it("returns the last registered dialog when multiple are open", () => {
    registerDialog(el1);
    registerDialog(el2);
    expect(getTopmostDialog()).toBe(el2);
    unregisterDialog(el2);
    unregisterDialog(el1);
  });

  it("returns previous dialog after topmost is unregistered", () => {
    registerDialog(el1);
    registerDialog(el2);
    unregisterDialog(el2);
    expect(getTopmostDialog()).toBe(el1);
    unregisterDialog(el1);
  });
});
