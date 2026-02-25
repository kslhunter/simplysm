import { describe, it, expect } from "vitest";
import "../../src/extensions/set-ext";

describe("Set prototype extensions", () => {
  //#region adds

  describe("adds()", () => {
    it("Adds multiple items at once", () => {
      const set = new Set([1, 2, 3]);
      const result = set.adds(4, 5, 6);

      expect(result).toBe(set); // returns original
      expect(set.size).toBe(6);
      expect(set.has(4)).toBe(true);
      expect(set.has(5)).toBe(true);
      expect(set.has(6)).toBe(true);
    });

    it("Automatically removes duplicate items", () => {
      const set = new Set([1, 2, 3]);
      set.adds(2, 3, 4);

      expect(set.size).toBe(4); // 1, 2, 3, 4
    });

    it("Adds multiple items to empty Set", () => {
      const set = new Set<number>();
      set.adds(1, 2, 3);

      expect(set.size).toBe(3);
    });
  });

  //#endregion

  //#region toggle

  describe("toggle()", () => {
    it("Adds item if not exists", () => {
      const set = new Set([1, 2, 3]);
      const result = set.toggle(4);

      expect(result).toBe(set); // returns original
      expect(set.has(4)).toBe(true);
      expect(set.size).toBe(4);
    });

    it("Removes item if exists", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(2);

      expect(set.has(2)).toBe(false);
      expect(set.size).toBe(2);
    });

    it("Force adds with addOrDel='add'", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(2, "add"); // already exists but add option

      expect(set.has(2)).toBe(true);
      expect(set.size).toBe(3); // unchanged
    });

    it("Force removes with addOrDel='del'", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(4, "del"); // not exists but del option

      expect(set.has(4)).toBe(false);
      expect(set.size).toBe(3); // unchanged
    });
  });

  //#endregion
});
