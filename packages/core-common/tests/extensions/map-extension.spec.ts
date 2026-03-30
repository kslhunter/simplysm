import { describe, it, expect } from "vitest";
import "../../src/extensions/map-ext";

describe("Map 프로토타입 확장", () => {
  //#region getOrCreate

  describe("getOrCreate()", () => {
    it("키가 없으면 값을 직접 설정하고 반환", () => {
      const map = new Map<string, number>();

      const result = map.getOrCreate("key", 100);

      expect(result).toBe(100);
      expect(map.get("key")).toBe(100);
      expect(map.size).toBe(1);
    });

    it("키가 없으면 팩토리 함수 호출 후 값 설정", () => {
      const map = new Map<string, number[]>();
      let factoryCalled = false;

      const result = map.getOrCreate("key", () => {
        factoryCalled = true;
        return [1, 2, 3];
      });

      expect(factoryCalled).toBe(true);
      expect(result).toEqual([1, 2, 3]);
      expect(map.get("key")).toEqual([1, 2, 3]);
    });

    it("키가 있으면 기존 값 반환, 팩토리 미호출", () => {
      const map = new Map<string, number>();
      map.set("key", 50);
      let factoryCalled = false;

      const result = map.getOrCreate("key", () => {
        factoryCalled = true;
        return 100;
      });

      expect(factoryCalled).toBe(false);
      expect(result).toBe(50);
      expect(map.get("key")).toBe(50);
    });

    it("빈 배열을 기본값으로 설정 가능", () => {
      const map = new Map<string, number[]>();

      const arr = map.getOrCreate("key", []);
      arr.push(1, 2, 3);

      expect(map.get("key")).toEqual([1, 2, 3]);
    });

    it("V 타입이 함수일 때 팩토리로 감싸서 저장", () => {
      const map = new Map<string, () => number>();
      const fn = () => 42;

      // Function value must be wrapped in factory to store
      const result = map.getOrCreate("key", () => fn);

      expect(result).toBe(fn);
      expect(result()).toBe(42);
      expect(map.get("key")).toBe(fn);
    });
  });

  //#endregion

  //#region update

  describe("update()", () => {
    it("기존 키의 값 업데이트", () => {
      const map = new Map<string, number>();
      map.set("key", 10);

      map.update("key", (v) => (v ?? 0) + 5);

      expect(map.get("key")).toBe(15);
    });

    it("존재하지 않는 키에 undefined 전달", () => {
      const map = new Map<string, number>();
      let receivedValue: number | undefined;

      map.update("key", (v) => {
        receivedValue = v;
        return 100;
      });

      expect(receivedValue).toBeUndefined();
      expect(map.get("key")).toBe(100);
    });

    it("콜백 반환값으로 값 교체", () => {
      const map = new Map<string, string>();
      map.set("key", "hello");

      map.update("key", (v) => (v ?? "") + " world");

      expect(map.get("key")).toBe("hello world");
    });
  });

  //#endregion
});
