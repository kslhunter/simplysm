import { describe, it, expect } from "vitest";
import "../../src/extensions/map-ext";

describe("Map.prototype 확장", () => {
  //#region getOrCreate

  describe("getOrCreate()", () => {
    it("키가 없으면 직접 값을 설정하고 반환한다", () => {
      const map = new Map<string, number>();

      const result = map.getOrCreate("key", 100);

      expect(result).toBe(100);
      expect(map.get("key")).toBe(100);
      expect(map.size).toBe(1);
    });

    it("키가 없으면 팩토리 함수를 호출하여 설정하고 반환한다", () => {
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

    it("키가 있으면 기존 값을 반환하고 팩토리 함수를 호출하지 않는다", () => {
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

    it("키가 있으면 기존 값을 반환한다 (직접 값)", () => {
      const map = new Map<string, number>();
      map.set("key", 50);

      const result = map.getOrCreate("key", 100);

      expect(result).toBe(50);
      expect(map.size).toBe(1);
    });

    it("빈 배열을 기본값으로 설정할 수 있다", () => {
      const map = new Map<string, number[]>();

      const arr = map.getOrCreate("key", []);
      arr.push(1, 2, 3);

      expect(map.get("key")).toEqual([1, 2, 3]);
    });

    it("팩토리 함수로 복잡한 객체를 생성할 수 있다", () => {
      const map = new Map<string, { count: number; items: string[] }>();

      const obj = map.getOrCreate("key", () => ({ count: 0, items: [] }));
      obj.count++;
      obj.items.push("item1");

      expect(map.get("key")).toEqual({ count: 1, items: ["item1"] });
    });

    it("V 타입이 함수인 경우 팩토리로 감싸서 저장한다", () => {
      const map = new Map<string, () => number>();
      const fn = () => 42;

      // 함수를 값으로 저장하려면 팩토리로 감싸야 함
      const result = map.getOrCreate("key", () => fn);

      expect(result).toBe(fn);
      expect(result()).toBe(42);
      expect(map.get("key")).toBe(fn);
    });
  });

  //#endregion

  //#region update

  describe("update()", () => {
    it("존재하는 키의 값을 업데이트한다", () => {
      const map = new Map<string, number>();
      map.set("key", 10);

      map.update("key", (v) => (v ?? 0) + 5);

      expect(map.get("key")).toBe(15);
    });

    it("존재하지 않는 키에 대해 undefined를 전달한다", () => {
      const map = new Map<string, number>();
      let receivedValue: number | undefined;

      map.update("key", (v) => {
        receivedValue = v;
        return 100;
      });

      expect(receivedValue).toBeUndefined();
      expect(map.get("key")).toBe(100);
    });

    it("콜백의 반환값으로 값을 교체한다", () => {
      const map = new Map<string, string>();
      map.set("key", "hello");

      map.update("key", (v) => (v ?? "") + " world");

      expect(map.get("key")).toBe("hello world");
    });

    it("객체 값을 업데이트할 수 있다", () => {
      const map = new Map<string, { count: number }>();
      map.set("key", { count: 5 });

      map.update("key", (v) => ({ count: (v?.count ?? 0) + 1 }));

      expect(map.get("key")).toEqual({ count: 6 });
    });

    it("여러 번 연속으로 업데이트할 수 있다", () => {
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
