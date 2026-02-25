import { describe, it, expect } from "vitest";
import "@simplysm/core-common"; // $ 확장 활성화

describe("Array.prototype extension", () => {
  //#region Basic chaining

  describe("Basic chaining", () => {
    it("can chain existing Array methods", () => {
      const result = [1, 2, 3, 4, 5].filter((x) => x > 2).map((x) => x * 10);

      expect(result).toEqual([30, 40, 50]);
    });

    it("can chain extension methods", () => {
      const result = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ].toMap((x) => x.id);

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });

    it("can chain Array methods and extension methods mixed", () => {
      const users = [
        { id: 1, name: "Kim", active: true },
        { id: 2, name: "Lee", active: false },
        { id: 3, name: "Park", active: true },
      ];

      const result = users.filter((u) => u.active).toMap((u) => u.id);

      expect(result.size).toBe(2);
      expect(result.has(1)).toBe(true);
      expect(result.has(3)).toBe(true);
      expect(result.has(2)).toBe(false);
    });

    it("can chain multiple levels", () => {
      const result = [1, 2, 3, 4, 5]
        .filter((x) => x > 1)
        .map((x) => x * 2)
        .filter((x) => x < 10)
        .toMap((x) => x);

      expect(result.size).toBe(3);
      expect(result.has(4)).toBe(true);
      expect(result.has(6)).toBe(true);
      expect(result.has(8)).toBe(true);
    });

    it("can access array properties", () => {
      const arr = [1, 2, 3];

      expect(arr.length).toBe(3);
      expect(arr[0]).toBe(1);
      expect(arr[1]).toBe(2);
      expect(arr[2]).toBe(3);
    });
  });

  //#endregion

  //#region single

  describe("single()", () => {
    it("returns single matching element", () => {
      const result = [1, 2, 3].single((x) => x === 2);

      expect(result).toBe(2);
    });

    it("returns undefined when no matching element", () => {
      const result = [1, 2, 3].single((x) => x === 4);

      expect(result).toBe(undefined);
    });

    it("throws error when multiple matching elements", () => {
      expect(() => [1, 1, 2].single((x) => x === 1)).toThrow();
    });

    it("targets entire array when called without condition", () => {
      expect([1].single()).toBe(1);
      expect(([] as number[]).single()).toBe(undefined);
      expect(() => [1, 2].single()).toThrow();
    });

    it("can use single after chaining", () => {
      const result = [1, 2, 3, 4, 5].filter((x) => x > 3).single((x) => x === 4);

      expect(result).toBe(4);
    });
  });

  //#endregion

  //#region 비동기 메서드

  describe("parallelAsync()", () => {
    it("performs parallel async execution", async () => {
      const result = await [1, 2, 3].parallelAsync(async (x) => Promise.resolve(x * 2));

      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("mapAsync()", () => {
    it("performs sequential async mapping", async () => {
      const result = await [1, 2, 3].mapAsync(async (x) => Promise.resolve(x * 2));

      expect(result).toEqual([2, 4, 6]);
    });

    it("can use mapAsync after chaining", async () => {
      const result = await [1, 2, 3, 4, 5]
        .filter((x) => x > 2)
        .mapAsync(async (x) => Promise.resolve(x * 10));

      expect(result).toEqual([30, 40, 50]);
    });
  });

  describe("filterAsync()", () => {
    it("performs async filtering", async () => {
      const result = await [1, 2, 3, 4, 5].filterAsync(async (x) => Promise.resolve(x > 2));

      expect(result).toEqual([3, 4, 5]);
    });
  });

  //#endregion

  //#region Map 변환

  describe("toMap()", () => {
    it("creates Map with key function", () => {
      const result = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ].toMap((x) => x.id);

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });

    it("transforms values with value function", () => {
      const result = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ].toMap(
        (x) => x.id,
        (x) => x.name,
      );

      expect(result.get(1)).toBe("a");
      expect(result.get(2)).toBe("b");
    });

    it("throws error when keys are duplicated", () => {
      expect(() =>
        [
          { id: 1, name: "a" },
          { id: 1, name: "b" },
        ].toMap((x) => x.id),
      ).toThrow("키가 중복되었습니다");
    });
  });

  describe("toMapAsync()", () => {
    it("creates Map with async key/value functions", async () => {
      const result = await [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ].toMapAsync(async (x) => Promise.resolve(x.id));

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });
  });

  describe("toArrayMap()", () => {
    it("creates Map with array values", () => {
      const result = [
        { type: "a", v: 1 },
        { type: "b", v: 2 },
        { type: "a", v: 3 },
      ].toArrayMap((x) => x.type);

      expect(result.get("a")).toHaveLength(2);
      expect(result.get("b")).toHaveLength(1);
    });

    it("transforms values with value function", () => {
      const result = [
        { type: "a", v: 1 },
        { type: "a", v: 2 },
      ].toArrayMap(
        (x) => x.type,
        (x) => x.v,
      );

      expect(result.get("a")).toEqual([1, 2]);
    });
  });

  describe("toSetMap()", () => {
    it("creates Map with Set values", () => {
      const result = [
        { type: "a", v: 1 },
        { type: "a", v: 1 }, // 중복
        { type: "a", v: 2 },
      ].toSetMap(
        (x) => x.type,
        (x) => x.v,
      );

      expect(result.get("a")?.size).toBe(2); // Set이므로 중복 제거
    });
  });

  describe("toMapValues()", () => {
    it("creates Map with aggregated results by group", () => {
      const result = [
        { type: "a", v: 10 },
        { type: "b", v: 20 },
        { type: "a", v: 30 },
      ].toMapValues(
        (x) => x.type,
        (items) => items.reduce((sum, x) => sum + x.v, 0),
      );

      expect(result.get("a")).toBe(40);
      expect(result.get("b")).toBe(20);
    });
  });

  //#endregion

  //#region 트리 변환

  describe("toTree()", () => {
    it("converts to tree structure", () => {
      interface Item {
        id: number;
        parentId?: number;
        name: string;
      }

      const items: Item[] = [
        { id: 1, name: "root" },
        { id: 2, parentId: 1, name: "child1" },
        { id: 3, parentId: 1, name: "child2" },
        { id: 4, parentId: 2, name: "grandchild" },
      ];

      const result = items.toTree("id", "parentId");

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].children).toHaveLength(1);
    });
  });

  //#endregion

  //#region 배열 비교

  describe("diffs()", () => {
    it("analyzes differences between arrays", () => {
      interface Item {
        id: number;
        value: string;
      }

      const source: Item[] = [
        { id: 1, value: "a" },
        { id: 2, value: "b" },
        { id: 3, value: "c" },
      ];

      const target: Item[] = [
        { id: 2, value: "b" },
        { id: 3, value: "changed" },
        { id: 4, value: "d" },
      ];

      const result = source.diffs(target, { keys: ["id"] });

      const deleted = result.find((d) => d.source?.id === 1);
      expect(deleted?.target).toBe(undefined);

      const updated = result.find((d) => d.source?.id === 3);
      expect(updated?.target?.value).toBe("changed");

      const inserted = result.find((d) => d.target?.id === 4);
      expect(inserted?.source).toBe(undefined);
    });
  });

  describe("oneWayDiffs()", () => {
    it("analyzes one-way differences", () => {
      interface Item {
        id: number;
        value: string;
      }

      const orgItems: Item[] = [
        { id: 1, value: "a" },
        { id: 2, value: "b" },
      ];

      const items: Item[] = [
        { id: 2, value: "changed" },
        { id: 3, value: "c" },
      ];

      const result = items.oneWayDiffs(orgItems, "id");

      const updated = result.find((d) => d.item.id === 2);
      expect(updated?.type).toBe("update");

      const created = result.find((d) => d.item.id === 3);
      expect(created?.type).toBe("create");
    });

    it("includes unchanged items when includeSame=true", () => {
      interface Item {
        id: number;
        value: string;
      }

      const orgItems: Item[] = [
        { id: 1, value: "a" },
        { id: 2, value: "b" },
      ];

      const items: Item[] = [
        { id: 1, value: "a" }, // 변경 없음
        { id: 2, value: "changed" },
      ];

      const result = items.oneWayDiffs(orgItems, "id", { includeSame: true });

      const same = result.find((d) => d.item.id === 1);
      expect(same?.type).toBe("same");

      const updated = result.find((d) => d.item.id === 2);
      expect(updated?.type).toBe("update");
    });
  });

  describe("merge()", () => {
    it("merges modified items", () => {
      interface Item {
        id: number;
        value: string;
      }

      const source: Item[] = [
        { id: 1, value: "a" },
        { id: 2, value: "b" },
      ];
      const target: Item[] = [
        { id: 1, value: "a" },
        { id: 2, value: "changed" },
      ];

      const result = source.merge(target, { keys: ["id"] });

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.id === 2)?.value).toBe("changed");
    });
  });

  //#endregion

  //#region ReadonlyArray support

  describe("ReadonlyArray support", () => {
    it("can use $ with readonly arrays", () => {
      const arr: readonly number[] = [1, 2, 3];
      const result = arr.filter((x) => x > 1).toMap((x) => x);

      expect(result.size).toBe(2);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
    });
  });

  //#endregion

  //#region various Array methods chaining

  describe("various Array methods chaining", () => {
    it("can chain flatMap", () => {
      const result = [
        [1, 2],
        [3, 4],
      ]
        .flatMap((x) => x)
        .toMap((x) => x);

      expect(result.size).toBe(4);
    });

    it("can chain slice", () => {
      const result = [1, 2, 3, 4, 5].slice(1, 4).toMap((x) => x);

      expect(result.size).toBe(3);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
      expect(result.has(4)).toBe(true);
    });

    it("can chain concat", () => {
      const result = [1, 2].concat([3, 4]).toMap((x) => x);

      expect(result.size).toBe(4);
    });

    it("can chain sort", () => {
      const result = [3, 1, 2].sort((a, b) => a - b).toMap((x, i) => i);

      expect(result.get(0)).toBe(1);
      expect(result.get(1)).toBe(2);
      expect(result.get(2)).toBe(3);
    });
  });

  //#endregion

  //#region first, last

  describe("first()", () => {
    it("returns first element", () => {
      expect([1, 2, 3].first()).toBe(1);
    });

    it("returns first matching element", () => {
      expect([1, 2, 3, 4, 5].first((x) => x > 3)).toBe(4);
    });

    it("returns undefined for empty array", () => {
      expect(([] as number[]).first()).toBe(undefined);
    });
  });

  describe("last()", () => {
    it("returns last element", () => {
      expect([1, 2, 3].last()).toBe(3);
    });

    it("returns last matching element", () => {
      expect([1, 2, 3, 4, 5].last((x) => x < 4)).toBe(3);
    });

    it("returns undefined for empty array", () => {
      expect(([] as number[]).last()).toBe(undefined);
    });
  });

  //#endregion

  //#region filterExists, ofType

  describe("filterExists()", () => {
    it("removes null/undefined", () => {
      const arr = [1, null, 2, undefined, 3];
      const result = arr.filterExists();
      expect(result).toEqual([1, 2, 3]);
    });

    it("can be chained", () => {
      const arr = [1, null, 2, undefined, 3];
      const result = arr.filterExists().map((x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("ofType()", () => {
    it("filters only elements of specific type (string)", () => {
      const arr = [1, "a", 2, "b", true];
      const result = arr.ofType("string");
      expect(result).toEqual(["a", "b"]);
    });

    it("filters only elements of specific type (number)", () => {
      const arr = [1, "a", 2, "b", 3];
      const result = arr.ofType("number");
      expect(result).toEqual([1, 2, 3]);
    });

    it("filters only elements of specific type (boolean)", () => {
      const arr = [1, "a", true, false, 2];
      const result = arr.ofType("boolean");
      expect(result).toEqual([true, false]);
    });
  });

  //#endregion

  //#region mapMany

  describe("mapMany()", () => {
    it("maps then flattens", () => {
      const result = [1, 2, 3].mapMany((x) => [x, x * 10]);
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });
  });

  describe("mapManyAsync()", () => {
    it("maps async then flattens", async () => {
      const result = await [1, 2, 3].mapManyAsync(async (x) => Promise.resolve([x, x * 10]));
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });

    it("maps async nested Promise array then flattens", async () => {
      const result = await [1, 2].mapManyAsync(async (x) => Promise.resolve([x, x + 1, x + 2]));
      expect(result).toEqual([1, 2, 3, 2, 3, 4]);
    });
  });

  //#endregion

  //#region groupBy

  describe("groupBy()", () => {
    it("groups by key", () => {
      const items = [
        { type: "a", value: 1 },
        { type: "b", value: 2 },
        { type: "a", value: 3 },
      ];
      const result = items.groupBy((x) => x.type);

      expect(result).toHaveLength(2);
      expect(result.find((g) => g.key === "a")?.values).toHaveLength(2);
      expect(result.find((g) => g.key === "b")?.values).toHaveLength(1);
    });
  });

  //#endregion

  //#region toObject

  describe("toObject()", () => {
    it("converts array to object", () => {
      const items = [
        { key: "a", value: 1 },
        { key: "b", value: 2 },
      ];
      const result = items.toObject(
        (x) => x.key,
        (x) => x.value,
      );

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it("throws error when keys are duplicated", () => {
      const items = [
        { key: "a", value: 1 },
        { key: "a", value: 2 },
      ];
      expect(() => items.toObject((x) => x.key)).toThrow();
    });
  });

  //#endregion

  //#region distinct

  describe("distinct()", () => {
    it("removes duplicates", () => {
      expect([1, 2, 2, 3, 3, 3].distinct()).toEqual([1, 2, 3]);
    });

    it("removes duplicates in object array", () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 1 }];
      const result = arr.distinct();
      expect(result).toHaveLength(2);
    });

    it("can be chained", () => {
      const result = [1, 2, 2, 3].distinct().map((x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    it("can use custom key with keyFn", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 1, name: "c" },
      ];
      const result = arr.distinct({ keyFn: (x) => x.id });
      expect(result).toHaveLength(2);
    });

    it("removes duplicates by reference comparison with matchAddress=true", () => {
      const obj1 = { a: 1 };
      const obj2 = { a: 1 }; // 같은 값이지만 다른 참조
      const arr = [obj1, obj1, obj2];
      const result = arr.distinct({ matchAddress: true });
      expect(result).toHaveLength(2);
      expect(result).toContain(obj1);
      expect(result).toContain(obj2);
    });
  });

  //#endregion

  //#region orderBy, orderByDesc

  describe("orderBy()", () => {
    it("sorts in ascending order", () => {
      expect([3, 1, 2].orderBy()).toEqual([1, 2, 3]);
    });

    it("can specify sort criteria with selector", () => {
      const items = [
        { name: "b", age: 30 },
        { name: "a", age: 20 },
        { name: "c", age: 25 },
      ];
      const result = items.orderBy((x) => x.age);
      expect(result.map((x) => x.age)).toEqual([20, 25, 30]);
    });

    it("can be chained", () => {
      const result = [3, 1, 2].orderBy().map((x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("orderByDesc()", () => {
    it("sorts in descending order", () => {
      expect([1, 3, 2].orderByDesc()).toEqual([3, 2, 1]);
    });
  });

  //#endregion

  //#region sum, min, max

  describe("sum()", () => {
    it("returns sum", () => {
      expect([1, 2, 3, 4, 5].sum()).toBe(15);
    });

    it("can extract values with selector", () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
      expect(items.sum((x) => x.value)).toBe(60);
    });

    it("returns 0 for empty array", () => {
      expect(([] as number[]).sum()).toBe(0);
    });

    it("throws error for non-number types", () => {
      expect(() => (["a", "b"] as unknown as number[]).sum()).toThrow("sum 은 number 에 대해서만");
    });
  });

  describe("min()", () => {
    it("returns minimum value", () => {
      expect([3, 1, 2].min()).toBe(1);
    });

    it("returns undefined for empty array", () => {
      expect(([] as number[]).min()).toBe(undefined);
    });

    it("throws error for non-number/string types", () => {
      expect(() => ([true, false] as unknown as number[]).min()).toThrow(
        "min 은 number/string 에 대해서만",
      );
    });
  });

  describe("max()", () => {
    it("returns maximum value", () => {
      expect([1, 3, 2].max()).toBe(3);
    });

    it("returns undefined for empty array", () => {
      expect(([] as number[]).max()).toBe(undefined);
    });

    it("throws error for non-number/string types", () => {
      expect(() => ([{}, {}] as unknown as number[]).max()).toThrow(
        "max 은 number/string 에 대해서만",
      );
    });
  });

  //#endregion

  //#region shuffle

  describe("shuffle()", () => {
    it("shuffles array (preserves original)", () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = original.shuffle();

      // 원본은 변경되지 않음
      expect(original).toEqual([1, 2, 3, 4, 5]);
      // 같은 요소들을 가짐
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  //#endregion

  //#region Mutable methods

  describe("distinctThis()", () => {
    it("removes duplicates in original array", () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const result = arr.distinctThis();

      expect(arr).toEqual([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("orderByThis()", () => {
    it("sorts original array in ascending order", () => {
      const arr = [3, 1, 2];
      arr.orderByThis();

      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe("orderByDescThis()", () => {
    it("sorts original array in descending order", () => {
      const arr = [1, 3, 2];
      arr.orderByDescThis();

      expect(arr).toEqual([3, 2, 1]);
    });
  });

  describe("insert()", () => {
    it("inserts item into original array", () => {
      const arr = [1, 3];
      arr.insert(1, 2);

      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe("remove()", () => {
    it("removes item from original array", () => {
      const arr = [1, 2, 3];
      arr.remove(2);

      expect(arr).toEqual([1, 3]);
    });

    it("removes items with condition function", () => {
      const arr = [1, 2, 3, 4];
      arr.remove((x) => x % 2 === 0);

      expect(arr).toEqual([1, 3]);
    });
  });

  describe("toggle()", () => {
    it("removes item if exists", () => {
      const arr = [1, 2, 3];
      arr.toggle(2);

      expect(arr).toEqual([1, 3]);
    });

    it("adds item if not exists", () => {
      const arr = [1, 3];
      arr.toggle(2);

      expect(arr).toEqual([1, 3, 2]);
    });
  });

  describe("clear()", () => {
    it("clears original array", () => {
      const arr = [1, 2, 3];
      arr.clear();

      expect(arr).toEqual([]);
    });
  });

  //#endregion
});
