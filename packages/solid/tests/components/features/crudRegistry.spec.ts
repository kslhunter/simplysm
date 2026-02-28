import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerCrud,
  unregisterCrud,
  activateCrud,
  isActiveCrud,
} from "../../../src/components/features/crudRegistry";

// Mock dialogZIndex — we need to control getTopmostDialog
vi.mock("../../../src/components/disclosure/dialogZIndex", () => ({
  getTopmostDialog: vi.fn(() => null),
}));

import { getTopmostDialog } from "../../../src/components/disclosure/dialogZIndex";
const mockGetTopmostDialog = vi.mocked(getTopmostDialog);

describe("crudRegistry", () => {
  let form1: HTMLFormElement;
  let form2: HTMLFormElement;

  beforeEach(() => {
    form1 = document.createElement("form");
    form2 = document.createElement("form");
    // Clean state
    unregisterCrud("a");
    unregisterCrud("b");
    mockGetTopmostDialog.mockReturnValue(null);
  });

  it("single registered crud is active", () => {
    registerCrud("a", form1);
    expect(isActiveCrud("a")).toBe(true);
    unregisterCrud("a");
  });

  it("last registered crud is active (auto-activate on register)", () => {
    registerCrud("a", form1);
    registerCrud("b", form2);
    expect(isActiveCrud("a")).toBe(false);
    expect(isActiveCrud("b")).toBe(true);
    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("activateCrud changes which crud is active", () => {
    registerCrud("a", form1);
    registerCrud("b", form2);
    activateCrud("a");
    expect(isActiveCrud("a")).toBe(true);
    expect(isActiveCrud("b")).toBe(false);
    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("unregistered crud is not active", () => {
    registerCrud("a", form1);
    unregisterCrud("a");
    expect(isActiveCrud("a")).toBe(false);
  });

  it("returns false for unknown id", () => {
    expect(isActiveCrud("unknown")).toBe(false);
  });

  it("Dialog boundary: only crud inside topmost Dialog is active", () => {
    const dialogEl = document.createElement("div");
    dialogEl.appendChild(form2);
    mockGetTopmostDialog.mockReturnValue(dialogEl);

    registerCrud("a", form1); // outside dialog
    registerCrud("b", form2); // inside dialog

    // b is inside the topmost dialog, so b should be active
    expect(isActiveCrud("b")).toBe(true);
    // a is outside, so a should not be active even if it was registered
    expect(isActiveCrud("a")).toBe(false);

    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("Dialog boundary: no crud inside topmost Dialog means none active", () => {
    const dialogEl = document.createElement("div");
    // form1 and form2 are NOT inside dialogEl
    mockGetTopmostDialog.mockReturnValue(dialogEl);

    registerCrud("a", form1);
    registerCrud("b", form2);

    expect(isActiveCrud("a")).toBe(false);
    expect(isActiveCrud("b")).toBe(false);

    unregisterCrud("a");
    unregisterCrud("b");
  });

  it("Dialog boundary: most recently activated crud inside dialog wins", () => {
    const dialogEl = document.createElement("div");
    const form3 = document.createElement("form");
    dialogEl.appendChild(form2);
    dialogEl.appendChild(form3);
    mockGetTopmostDialog.mockReturnValue(dialogEl);

    registerCrud("a", form1);  // outside
    registerCrud("b", form2);  // inside
    registerCrud("c", form3);  // inside, last registered

    expect(isActiveCrud("c")).toBe(true);
    expect(isActiveCrud("b")).toBe(false);

    activateCrud("b");
    expect(isActiveCrud("b")).toBe(true);
    expect(isActiveCrud("c")).toBe(false);

    unregisterCrud("a");
    unregisterCrud("b");
    unregisterCrud("c");
  });
});
