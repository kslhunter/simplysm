import { describe, it, expect } from "vitest";
import "../../src/extensions/map-ext";

describe("Map 프로토타입 확장", () => {
  //#region getOrCreate

  describe("getOrCreate()", () => {
    it("키가 없을 때 값을 직접 설정하고 반환", () => {
      const map = new Map<string, number>();

      const result = map.getOrCreate("key", 100);

      expect(result).toBe(100);
      expect(map.get("key")).toBe(100);
      expect(map.size).toBe(1);
    });

    it("키가 없을 때 팩토리 함수를 호출하여 값을 설정하고 반환", () => {
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

    it("키가 있을 때 기존 값을 반환하고 팩토리 함수는 호출하지 않음", () => {
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

    it("키가 있을 때 기존 값 반환 (직접 값)", () => {
      const map = new Map<string, number>();
      map.set("key", 50);

      const result = map.getOrCreate("key", 100);

      expect(result).toBe(50);
      expect(map.size).toBe(1);
    });

    it("기본값으로 빈 배열 설정 가능", () => {
      const map = new Map<string, number[]>();

      const arr = map.getOrCreate("key", []);
      arr.push(1, 2, 3);

      expect(map.get("key")).toEqual([1, 2, 3]);
    });

    it("팩토리 함수로 복잡한 객체 생성 가능", () => {
      const map = new Map<string, { count: number; items: string[] }>();

      const obj = map.getOrCreate("key", () => ({ count: 0, items: [] }));
      obj.count++;
      obj.items.push("item1");

      expect(map.get("key")).toEqual({ count: 1, items: ["item1"] });
    });

    it("V 타입이 함수일 때 함수 값을 팩토리로 래핑", () => {
      const map = new Map<string, () => number>();
      const fn = () => 42;

      // 함수 값은 저장하기 위해 팩토리로 래핑해야 함
      const result = map.getOrCreate("key", () => fn);

      expect(result).toBe(fn);
      expect(result()).toBe(42);
      expect(map.get("key")).toBe(fn);
    });
  });

  //#endregion

  //#region update

  describe("update()", () => {
    it("기존 키의 값을 업데이트", () => {
      const map = new Map<string, number>();
      map.set("key", 10);

      map.update("key", (v) => (v ?? 0) + 5);

      expect(map.get("key")).toBe(15);
    });

    it("존재하지 않는 키에는 undefined 전달", () => {
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

    it("객체 값 업데이트 가능", () => {
      const map = new Map<string, { count: number }>();
      map.set("key", { count: 5 });

      map.update("key", (v) => ({ count: (v?.count ?? 0) + 1 }));

      expect(map.get("key")).toEqual({ count: 6 });
    });

    it("연속해서 여러 번 업데이트 가능", () => {
      const map = new Map<string, number>();
      map.set("counter", 0);

      map.update("counter", (v) => (v ?? 0) + 1);
      map.update("counter", (v) => (v ?? 0) + 1);
      map.update("counter", (v) => (v ?? 0) + 1);

      expect(map.get("counter")).toBe(3);
    });
  });

  //#endregion
});
