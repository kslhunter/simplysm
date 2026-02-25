import { describe, it, expect } from "vitest";
import "../../src/extensions/map-ext";

describe("Map.prototype extension", () => {
  //#region getOrCreate

  describe("getOrCreate()", () => {
    it("sets and returns value directly when key does not exist", () => {
      const map = new Map<string, number>();

      const result = map.getOrCreate("key", 100);

      expect(result).toBe(100);
      expect(map.get("key")).toBe(100);
      expect(map.size).toBe(1);
    });

    it("calls factory function to set and return value when key does not exist", () => {
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

    it("returns existing value and does not call factory function when key exists", () => {
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

    it("returns existing value when key exists (direct value)", () => {
      const map = new Map<string, number>();
      map.set("key", 50);

      const result = map.getOrCreate("key", 100);

      expect(result).toBe(50);
      expect(map.size).toBe(1);
    });

    it("can set empty array as default value", () => {
      const map = new Map<string, number[]>();

      const arr = map.getOrCreate("key", []);
      arr.push(1, 2, 3);

      expect(map.get("key")).toEqual([1, 2, 3]);
    });

    it("can create complex objects with factory function", () => {
      const map = new Map<string, { count: number; items: string[] }>();

      const obj = map.getOrCreate("key", () => ({ count: 0, items: [] }));
      obj.count++;
      obj.items.push("item1");

      expect(map.get("key")).toEqual({ count: 1, items: ["item1"] });
    });

    it("wraps function value in factory when V type is a function", () => {
      const map = new Map<string, () => number>();
      const fn = () => 42;

      // Function value must be wrapped in factory to store it
      const result = map.getOrCreate("key", () => fn);

      expect(result).toBe(fn);
      expect(result()).toBe(42);
      expect(map.get("key")).toBe(fn);
    });
  });

  //#endregion

  //#region update

  describe("update()", () => {
    it("updates value of existing key", () => {
      const map = new Map<string, number>();
      map.set("key", 10);

      map.update("key", (v) => (v ?? 0) + 5);

      expect(map.get("key")).toBe(15);
    });

    it("passes undefined for non-existent key", () => {
      const map = new Map<string, number>();
      let receivedValue: number | undefined;

      map.update("key", (v) => {
        receivedValue = v;
        return 100;
      });

      expect(receivedValue).toBeUndefined();
      expect(map.get("key")).toBe(100);
    });

    it("replaces value with return value of callback", () => {
      const map = new Map<string, string>();
      map.set("key", "hello");

      map.update("key", (v) => (v ?? "") + " world");

      expect(map.get("key")).toBe("hello world");
    });

    it("can update object value", () => {
      const map = new Map<string, { count: number }>();
      map.set("key", { count: 5 });

      map.update("key", (v) => ({ count: (v?.count ?? 0) + 1 }));

      expect(map.get("key")).toEqual({ count: 6 });
    });

    it("can update multiple times consecutively", () => {
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
