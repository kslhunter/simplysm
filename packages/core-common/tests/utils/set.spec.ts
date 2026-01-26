import { describe, it, expect } from "vitest";
import { setAdds, setToggle } from "../../src/utils/set";

describe("set utils", () => {
  //#region setAdds

  describe("setAdds()", () => {
    it("여러 항목을 한 번에 추가한다", () => {
      const set = new Set([1, 2, 3]);
      const result = setAdds(set, 4, 5, 6);

      expect(result).toBe(set); // 원본 반환
      expect(set.size).toBe(6);
      expect(set.has(4)).toBe(true);
      expect(set.has(5)).toBe(true);
      expect(set.has(6)).toBe(true);
    });

    it("중복된 항목은 자동으로 제거된다", () => {
      const set = new Set([1, 2, 3]);
      setAdds(set, 2, 3, 4);

      expect(set.size).toBe(4); // 1, 2, 3, 4
    });

    it("빈 Set에 여러 항목을 추가한다", () => {
      const set = new Set<number>();
      setAdds(set, 1, 2, 3);

      expect(set.size).toBe(3);
    });

    it("data-last 스타일로 사용할 수 있다", () => {
      const set = new Set([1, 2, 3]);
      const fn = setAdds(4, 5, 6);

      const result = fn(set);

      expect(result).toBe(set);
      expect(set.size).toBe(6);
    });
  });

  //#endregion

  //#region setToggle

  describe("setToggle()", () => {
    it("없는 항목을 추가한다", () => {
      const set = new Set([1, 2, 3]);
      const result = setToggle(set, 4);

      expect(result).toBe(set); // 원본 반환
      expect(set.has(4)).toBe(true);
      expect(set.size).toBe(4);
    });

    it("있는 항목을 제거한다", () => {
      const set = new Set([1, 2, 3]);
      setToggle(set, 2);

      expect(set.has(2)).toBe(false);
      expect(set.size).toBe(2);
    });

    it("addOrDel='add'로 강제로 추가한다", () => {
      const set = new Set([1, 2, 3]);
      setToggle(set, 2, "add"); // 이미 있지만 add 옵션

      expect(set.has(2)).toBe(true);
      expect(set.size).toBe(3); // 변화 없음
    });

    it("addOrDel='del'로 강제로 제거한다", () => {
      const set = new Set([1, 2, 3]);
      setToggle(set, 4, "del"); // 없지만 del 옵션

      expect(set.has(4)).toBe(false);
      expect(set.size).toBe(3); // 변화 없음
    });

    it("data-last 스타일로 사용할 수 있다", () => {
      const set = new Set([1, 2, 3]);
      const fn = setToggle(4);

      const result = fn(set);

      expect(result).toBe(set);
      expect(set.has(4)).toBe(true);
    });

    it("data-last 스타일로 addOrDel 옵션을 사용할 수 있다", () => {
      const set = new Set([1, 2, 3]);
      const fn = setToggle(5, "add");

      fn(set);

      expect(set.has(5)).toBe(true);
    });
  });

  //#endregion
});
