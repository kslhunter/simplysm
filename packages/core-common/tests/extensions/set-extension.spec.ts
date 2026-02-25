import { describe, it, expect } from "vitest";
import "../../src/extensions/set-ext";

describe("Set.prototype extension", () => {
  //#region adds

  describe("adds()", () => {
    it("adds multiple items at once", () => {
      const set = new Set([1, 2, 3]);
      const result = set.adds(4, 5, 6);

      expect(result).toBe(set); // Returns original
      expect(set.size).toBe(6);
      expect(set.has(4)).toBe(true);
      expect(set.has(5)).toBe(true);
      expect(set.has(6)).toBe(true);
    });

    it("automatically removes duplicate items", () => {
      const set = new Set([1, 2, 3]);
      set.adds(2, 3, 4);

      expect(set.size).toBe(4); // 1, 2, 3, 4
    });

    it("adds multiple items to empty Set", () => {
      const set = new Set<number>();
      set.adds(1, 2, 3);

      expect(set.size).toBe(3);
    });
  });

  //#endregion

  //#region toggle

  describe("toggle()", () => {
    it("adds item if it does not exist", () => {
      const set = new Set([1, 2, 3]);
      const result = set.toggle(4);

      expect(result).toBe(set); // Returns original
      expect(set.has(4)).toBe(true);
      expect(set.size).toBe(4);
    });

    it("removes item if it exists", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(2);

      expect(set.has(2)).toBe(false);
      expect(set.size).toBe(2);
    });

    it("forces adding with addOrDel='add'", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(2, "add"); // Already exists but add option

      expect(set.has(2)).toBe(true);
      expect(set.size).toBe(3); // No change
    });

    it("forces removing with addOrDel='del'", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(4, "del"); // Does not exist but del option

      expect(set.has(4)).toBe(false);
      expect(set.size).toBe(3); // No change
    });
  });

  //#endregion
});
