import { describe, it, expect } from "vitest";
import "../../src/extensions/set-ext";

describe("Set.prototype 확장", () => {
  //#region adds

  describe("adds()", () => {
    it("여러 항목을 한 번에 추가한다", () => {
      const set = new Set([1, 2, 3]);
      const result = set.adds(4, 5, 6);

      expect(result).toBe(set); // 원본 반환
      expect(set.size).toBe(6);
      expect(set.has(4)).toBe(true);
      expect(set.has(5)).toBe(true);
      expect(set.has(6)).toBe(true);
    });

    it("중복된 항목은 자동으로 제거된다", () => {
      const set = new Set([1, 2, 3]);
      set.adds(2, 3, 4);

      expect(set.size).toBe(4); // 1, 2, 3, 4
    });

    it("빈 Set에 여러 항목을 추가한다", () => {
      const set = new Set<number>();
      set.adds(1, 2, 3);

      expect(set.size).toBe(3);
    });
  });

  //#endregion

  //#region toggle

  describe("toggle()", () => {
    it("없는 항목을 추가한다", () => {
      const set = new Set([1, 2, 3]);
      const result = set.toggle(4);

      expect(result).toBe(set); // 원본 반환
      expect(set.has(4)).toBe(true);
      expect(set.size).toBe(4);
    });

    it("있는 항목을 제거한다", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(2);

      expect(set.has(2)).toBe(false);
      expect(set.size).toBe(2);
    });

    it("addOrDel='add'로 강제로 추가한다", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(2, "add"); // 이미 있지만 add 옵션

      expect(set.has(2)).toBe(true);
      expect(set.size).toBe(3); // 변화 없음
    });

    it("addOrDel='del'로 강제로 제거한다", () => {
      const set = new Set([1, 2, 3]);
      set.toggle(4, "del"); // 없지만 del 옵션

      expect(set.has(4)).toBe(false);
      expect(set.size).toBe(3); // 변화 없음
    });
  });

  //#endregion
});
