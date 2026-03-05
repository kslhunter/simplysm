import { describe, it, expect } from "vitest";
import { obj as objU, DateTime, DateOnly, Uuid } from "@simplysm/core-common";

describe("object utils", () => {
  //#region clone

  describe("objClone()", () => {
    it("Clones primitive values", () => {
      expect(objU.clone(42)).toBe(42);
      expect(objU.clone("hello")).toBe("hello");
      expect(objU.clone(true)).toBe(true);
      expect(objU.clone(null)).toBe(null);
      expect(objU.clone(undefined)).toBe(undefined);
    });

    it("Deep clones array", () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = objU.clone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it("Deep clones object", () => {
      const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
      const cloned = objU.clone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
      expect(cloned.d).not.toBe(obj.d);
    });

    it("Clones Date", () => {
      const date = new Date(2024, 2, 15);
      const cloned = objU.clone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it("Clones DateTime", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const cloned = objU.clone(dt);

      expect(cloned.tick).toBe(dt.tick);
      expect(cloned).not.toBe(dt);
    });

    it("Clones DateOnly", () => {
      const d = new DateOnly(2024, 3, 15);
      const cloned = objU.clone(d);

      expect(cloned.tick).toBe(d.tick);
      expect(cloned).not.toBe(d);
    });

    it("Clones Uuid", () => {
      const uuid = Uuid.generate();
      const cloned = objU.clone(uuid);

      expect(cloned.toString()).toBe(uuid.toString());
      expect(cloned).not.toBe(uuid);
    });

    it("Clones Map", () => {
      const map = new Map<string, number | { c: number }>([
        ["a", 1],
        ["b", { c: 2 }],
      ]);
      const cloned = objU.clone(map);

      expect(cloned.get("a")).toBe(1);
      expect(cloned.get("b")).toEqual({ c: 2 });
      expect(cloned.get("b")).not.toBe(map.get("b"));
    });

    it("Clones Set", () => {
      const obj = { a: 1 };
      const set = new Set([1, 2, obj]);
      const cloned = objU.clone(set);

      expect(cloned.has(1)).toBe(true);
      expect(cloned.has(2)).toBe(true);
      // Object in Set is cloned
      const clonedObj = Array.from(cloned).find((item) => typeof item === "object");
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
    });

    it("Handles circular references", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj["self"] = obj;

      const cloned = objU.clone(obj);

      expect(cloned["a"]).toBe(1);
      expect(cloned["self"]).toBe(cloned);
      expect(cloned).not.toBe(obj);
    });

    it("Clones RegExp", () => {
      const regex = /test/gi;
      const cloned = objU.clone(regex);

      expect(cloned).toEqual(regex);
      expect(cloned).not.toBe(regex);
      expect(cloned.source).toBe("test");
      expect(cloned.flags).toBe("gi");
    });

    it("Clones Error", () => {
      const error = new Error("test error");
      const cloned = objU.clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned).not.toBe(error);
    });

    it("Clones Error cause", () => {
      const cause = new Error("cause error");
      const error = new Error("test error", { cause });
      const cloned = objU.clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned.cause).toBeInstanceOf(Error);
      expect((cloned.cause as Error).message).toBe("cause error");
    });

    it("Clones Error custom properties", () => {
      const error = new Error("test") as Error & { code: string; detail: object };
      error.code = "ERR_CODE";
      error.detail = { key: "value" };
      const cloned = objU.clone(error);

      expect(cloned.code).toBe("ERR_CODE");
      expect(cloned.detail).toEqual({ key: "value" });
      expect(cloned.detail).not.toBe(error.detail);
    });

    it("Clones Uint8Array", () => {
      const arr = new Uint8Array([1, 2, 3, 4, 5]);
      const cloned = objU.clone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned.buffer).not.toBe(arr.buffer);
    });

    it("Symbol keys are not cloned", () => {
      // Object.keys() does not enumerate Symbol keys, so they are not cloned
      const sym = Symbol("test");
      const obj = { a: 1, [sym]: "symbol value" };
      const cloned = objU.clone(obj);

      expect(cloned.a).toBe(1);
      expect(cloned[sym]).toBeUndefined();
    });
  });

  //#endregion

  //#region equal

  describe("objU.equal()", () => {
    it("Compares primitive values", () => {
      expect(objU.equal(1, 1)).toBe(true);
      expect(objU.equal(1, 2)).toBe(false);
      expect(objU.equal("a", "a")).toBe(true);
      expect(objU.equal(null, null)).toBe(true);
      expect(objU.equal(undefined, undefined)).toBe(true);
      expect(objU.equal(null, undefined)).toBe(false);
    });

    it("Compares arrays", () => {
      expect(objU.equal([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(objU.equal([1, 2, 3], [1, 2])).toBe(false);
      expect(objU.equal([1, 2, 3], [1, 3, 2])).toBe(false);
    });

    it("Compares objects", () => {
      expect(objU.equal({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(objU.equal({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(objU.equal({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("Compares nested objects", () => {
      expect(objU.equal({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
      expect(objU.equal({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    });

    it("Compares DateTime", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = new DateTime(2024, 3, 15);
      const dt3 = new DateTime(2024, 3, 16);

      expect(objU.equal(dt1, dt2)).toBe(true);
      expect(objU.equal(dt1, dt3)).toBe(false);
    });

    it("Compares Uuid", () => {
      const uuid1 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid2 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid3 = new Uuid("12345678-9abc-def0-1234-56789abcdef1");

      expect(objU.equal(uuid1, uuid2)).toBe(true);
      expect(objU.equal(uuid1, uuid3)).toBe(false);
    });

    it("Compares RegExp", () => {
      const regex1 = /test/gi;
      const regex2 = /test/gi;
      const regex3 = /test/g;
      const regex4 = /other/gi;

      expect(objU.equal(regex1, regex2)).toBe(true);
      expect(objU.equal(regex1, regex3)).toBe(false); // Different flags
      expect(objU.equal(regex1, regex4)).toBe(false); // Different source
    });

    it("Compares Map", () => {
      const map1 = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const map2 = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const map3 = new Map([
        ["a", 1],
        ["b", 3],
      ]);

      expect(objU.equal(map1, map2)).toBe(true);
      expect(objU.equal(map1, map3)).toBe(false);
    });

    it("Compares Set", () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);
      const set3 = new Set([1, 2, 4]);

      expect(objU.equal(set1, set2)).toBe(true);
      expect(objU.equal(set1, set3)).toBe(false);
    });

    it("Compares only specific keys with topLevelIncludes option", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(objU.equal(obj1, obj2, { topLevelIncludes: ["a"] })).toBe(true);
      expect(objU.equal(obj1, obj2, { topLevelIncludes: ["a", "b"] })).toBe(false);
    });

    it("Excludes specific keys with topLevelExcludes option", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(objU.equal(obj1, obj2, { topLevelExcludes: ["b", "c"] })).toBe(true);
    });

    it("Ignores array order with ignoreArrayIndex option", () => {
      expect(objU.equal([1, 2, 3], [3, 2, 1], { ignoreArrayIndex: true })).toBe(true);
    });

    it("Performs shallow comparison with shallow option", () => {
      const inner = { c: 1 };
      const obj1 = { a: 1, b: inner };
      const obj2 = { a: 1, b: inner };
      const obj3 = { a: 1, b: { c: 1 } };

      expect(objU.equal(obj1, obj2, { shallow: true })).toBe(true);
      expect(objU.equal(obj1, obj3, { shallow: true })).toBe(false);
    });
  });

  //#endregion

  //#region merge

  describe("objU.merge()", () => {
    it("Copies target when source is null", () => {
      const target = { a: 1 };
      const result = objU.merge(null, target);

      expect(result).toEqual({ a: 1 });
      expect(result).not.toBe(target);
    });

    it("Copies source when target is undefined", () => {
      const source = { a: 1 };
      const result = objU.merge(source, undefined);

      expect(result).toEqual({ a: 1 });
    });

    it("Merges objects", () => {
      const source = { a: 1, b: 2 };
      const target = { b: 3, c: 4 };
      const result = objU.merge(source, target);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("Merges nested objects", () => {
      const source = { a: { b: 1, c: 2 } };
      const target = { a: { c: 3, d: 4 } };
      const result = objU.merge(source, target);

      expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
    });

    it("Replaces array with arrayProcess: replace", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [4, 5] };
      const result = objU.merge(source, target, { arrayProcess: "replace" });

      expect(result.arr).toEqual([4, 5]);
    });

    it("Concatenates arrays with arrayProcess: concat", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [3, 4, 5] };
      const result = objU.merge(source, target, { arrayProcess: "concat" });

      // Duplicates removed via Set
      expect(result.arr).toEqual([1, 2, 3, 4, 5]);
    });

    it("Deletes when null with useDelTargetNull option", () => {
      const source = { a: 1, b: 2 };
      const target = { b: null };
      const result = objU.merge(source, target, { useDelTargetNull: true });

      expect(result).toEqual({ a: 1 });
    });

    it("Returns target when source is object and target is primitive", () => {
      const source = { a: 1 };
      const target = "string";

      const result = objU.merge(source, target as any);

      expect(result).toBe("string");
    });

    it("Returns target when source is primitive and target is object", () => {
      const source = "string";
      const target = { a: 1 };

      const result = objU.merge(source as any, target);

      expect(result).toEqual({ a: 1 });
    });

    it("Returns target when source is array and target is plain object", () => {
      const source = [1, 2, 3];
      const target = { a: 1 };

      const result = objU.merge(source as any, target);

      expect(result).toEqual({ a: 1 });
    });

    it("Returns target when source is plain object and target is array", () => {
      const source = { a: 1 };
      const target = [1, 2, 3];

      const result = objU.merge(source as any, target);

      expect(result).toEqual([1, 2, 3]);
    });

    it("Merges deeply nested objects (3+ levels)", () => {
      const source = {
        level1: {
          level2: {
            level3: {
              a: 1,
              b: 2,
            },
            x: 10,
          },
          y: 20,
        },
        z: 30,
      };
      const target = {
        level1: {
          level2: {
            level3: {
              b: 3,
              c: 4,
            },
          },
        },
      };

      const result = objU.merge(source, target);

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              a: 1,
              b: 3,
              c: 4,
            },
            x: 10,
          },
          y: 20,
        },
        z: 30,
      });
    });

    it("Modifies only deep value in 4-level nesting", () => {
      const source = {
        a: {
          b: {
            c: {
              d: { value: 1 },
            },
          },
        },
      };
      const target = {
        a: {
          b: {
            c: {
              d: { value: 2 },
            },
          },
        },
      };

      const result = objU.merge(source, target);

      expect(result.a.b.c.d.value).toBe(2);
    });

    it("Clones new key-value in Map merge", () => {
      const sourceMap = new Map<string, { value: number }>([["key1", { value: 1 }]]);
      const targetObj = { value: 2 };
      const targetMap = new Map<string, { value: number }>([["key2", targetObj]]);

      const result = objU.merge(sourceMap, targetMap);

      // key2 value is cloned, should be different reference
      expect(result.get("key2")).toEqual({ value: 2 });
      expect(result.get("key2")).not.toBe(targetObj);
    });
  });

  describe("objU.merge3()", () => {
    it("Uses source value when only source changes", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 2 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it("Uses target value when only target changes", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 2 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 4 });
    });

    it("Uses value without conflict when both change to same value", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 5 };
      const target = { a: 1, b: 5 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 5 });
    });

    it("Returns conflict when both change to different values", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      // Origin value preserved
      expect(result.b).toBe(2);
    });

    it("Returns conflict when only some keys conflict", () => {
      const origin = { a: 1, b: 2, c: 3 };
      const source = { a: 10, b: 20, c: 3 };
      const target = { a: 1, b: 30, c: 4 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a).toBe(10); // Only source changed
      expect(result.b).toBe(2); // Both changed differently → conflict → origin preserved
      expect(result.c).toBe(4); // Only target changed
    });

    it("Detects conflict in nested objects", () => {
      const origin = { a: { b: 1, c: 2 } };
      const source = { a: { b: 10, c: 2 } };
      const target = { a: { b: 20, c: 2 } };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a.b).toBe(1); // Both changed differently → conflict → origin preserved
      expect(result.a.c).toBe(2);
    });

    it("Detects conflict in nested object when different internal keys change", () => {
      // merge3 compares at key level, so entire { a: {...} } is compared
      // If source.a differs from origin.a and target.a differs from origin.a, conflict
      const origin = { a: { b: 1, c: 2 } };
      const source = { a: { b: 10, c: 2 } };
      const target = { a: { b: 1, c: 20 } };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a.b).toBe(1); // Conflict → origin preserved
      expect(result.a.c).toBe(2);
    });

    it("Detects conflict in array", () => {
      const origin = { arr: [1, 2, 3] };
      const source = { arr: [1, 2, 4] };
      const target = { arr: [1, 2, 5] };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.arr).toEqual([1, 2, 3]); // Conflict → origin preserved
    });

    it("Detects conflict in primitive value", () => {
      const origin = { value: "original" };
      const source = { value: "from source" };
      const target = { value: "from target" };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.value).toBe("original"); // Conflict → origin preserved
    });
  });

  //#endregion

  //#region omit / pick

  describe("objU.omit()", () => {
    it("Excludes specific keys", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.omit(obj, ["b"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("Excludes multiple keys", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = objU.omit(obj, ["a", "c"]);

      expect(result).toEqual({ b: 2, d: 4 });
    });
  });

  describe("objU.omitByFilter()", () => {
    it("Excludes keys matching condition", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.omitByFilter(obj, (key) => key === "b");

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe("objU.pick()", () => {
    it("Selects only specific keys", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.pick(obj, ["a", "c"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  //#endregion

  //#region chain value

  describe("objU.getChainValue()", () => {
    it("Gets value using dot notation", () => {
      const obj = { a: { b: { c: 1 } } };

      expect(objU.getChainValue(obj, "a.b.c")).toBe(1);
    });

    it("Gets value using array notation", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };

      expect(objU.getChainValue(obj, "arr[1].name")).toBe("second");
    });

    it("Returns undefined for non-existent path with optional: true", () => {
      const obj = { a: 1 };

      expect(objU.getChainValue(obj, "b.c.d", true)).toBe(undefined);
    });
  });

  describe("objU.getChainValueByDepth()", () => {
    it("Descends by depth using same key", () => {
      const obj = {
        parent: {
          parent: {
            parent: {
              name: "leaf",
            },
          },
        },
      };

      const result = objU.getChainValueByDepth(obj, "parent", 2);

      expect(result).toEqual({ parent: { name: "leaf" } });
    });

    it("Throws error when depth is 0", () => {
      const obj = { parent: { name: "child" } };

      expect(() => objU.getChainValueByDepth(obj, "parent", 0)).toThrow(
        "depth must be 1 or greater",
      );
    });

    it("Descends one level when depth is 1", () => {
      const obj = { parent: { name: "child" } };

      const result = objU.getChainValueByDepth(obj, "parent", 1);

      expect(result).toEqual({ name: "child" });
    });

    it("Returns undefined when intermediate path missing with optional: true", () => {
      const obj = { parent: { name: "child" } };

      const result = objU.getChainValueByDepth(obj, "parent", 5, true);

      expect(result).toBe(undefined);
    });

    it("Throws error when intermediate path missing without optional", () => {
      const obj = { parent: undefined as unknown };

      // Without optional, trying to access property on undefined throws error
      // Current implementation only checks result == null inside optional condition
      // So without optional, error is possible
      expect(() => objU.getChainValueByDepth(obj as any, "parent", 2)).toThrow();
    });
  });

  describe("objU.setChainValue()", () => {
    it("Sets value using dot notation", () => {
      const obj: Record<string, unknown> = {};
      objU.setChainValue(obj, "a.b.c", 1);

      expect(obj).toEqual({ a: { b: { c: 1 } } });
    });

    it("Overwrites existing value", () => {
      const obj = { a: { b: { c: 1 } } };
      objU.setChainValue(obj, "a.b.c", 2);

      expect(obj.a.b.c).toBe(2);
    });

    it("Throws error for empty chain", () => {
      const obj: Record<string, unknown> = {};

      expect(() => objU.setChainValue(obj, "", 1)).toThrow();
    });
  });

  describe("objU.deleteChainValue()", () => {
    it("Deletes value at chain path", () => {
      const obj = { a: { b: { c: 1, d: 2 } } };
      objU.deleteChainValue(obj, "a.b.c");

      expect(obj.a.b).toEqual({ d: 2 });
    });

    it("Silently ignores non-existent path", () => {
      const obj = { a: 1 };

      // No error when intermediate path missing
      expect(() => objU.deleteChainValue(obj, "b.c.d")).not.toThrow();
      expect(obj).toEqual({ a: 1 });
    });

    it("Silently ignores undefined intermediate path", () => {
      const obj: Record<string, unknown> = { a: undefined };

      expect(() => objU.deleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: undefined });
    });

    it("Silently ignores null intermediate path", () => {
      const obj: Record<string, unknown> = { a: null };

      expect(() => objU.deleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: null });
    });

    it("Deletes using array index path", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };
      objU.deleteChainValue(obj, "arr[0].name");

      expect(obj.arr[0]).toEqual({});
      expect(obj.arr[1]).toEqual({ name: "second" });
    });

    it("Throws error for empty chain", () => {
      const obj = { a: 1 };

      expect(() => objU.deleteChainValue(obj, "")).toThrow();
    });
  });

  //#endregion

  //#region clear / transform

  describe("objU.clearUndefined()", () => {
    it("Deletes keys with undefined value", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = objU.clearUndefined(obj);

      expect(result).toEqual({ a: 1, c: 3 });
      expect("b" in result).toBe(false);
    });
  });

  describe("objU.clear()", () => {
    it("Deletes all keys", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.clear(obj);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("objU.nullToUndefined()", () => {
    it("Converts null to undefined", () => {
      expect(objU.nullToUndefined(null)).toBe(undefined);
    });

    it("Converts nested null to undefined", () => {
      const obj = { a: 1, b: null, c: { d: null } };
      const result = objU.nullToUndefined(obj);

      expect(result).toEqual({ a: 1, b: undefined, c: { d: undefined } });
    });

    it("Converts null in array to undefined", () => {
      const arr = [1, null, { a: null }];
      const result = objU.nullToUndefined(arr);

      expect(result).toEqual([1, undefined, { a: undefined }]);
    });

    it("Safely handles object with circular references", () => {
      const obj: Record<string, unknown> = { a: null };
      obj["self"] = obj;
      const result = objU.nullToUndefined(obj);
      expect(result).toBeDefined();
      expect((result as Record<string, unknown>)["a"]).toBeUndefined();
    });

    it("Safely handles array with circular references", () => {
      const arr: unknown[] = [null, 1];
      arr.push(arr);
      const result = objU.nullToUndefined(arr);
      expect(result).toBeDefined();
      expect((result as unknown[])[0]).toBeUndefined();
      expect((result as unknown[])[1]).toBe(1);
    });
  });

  describe("objU.unflatten()", () => {
    it("Converts flattened object to nested", () => {
      const flat = { "a.b.c": 1, "a.b.d": 2, "e": 3 };
      const result = objU.unflatten(flat);

      expect(result).toEqual({
        a: { b: { c: 1, d: 2 } },
        e: 3,
      });
    });
  });

  //#endregion
});
