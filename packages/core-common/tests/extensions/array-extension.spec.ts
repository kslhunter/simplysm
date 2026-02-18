import { describe, it, expect } from "vitest";
import "@simplysm/core-common"; // $ 확장 활성화

describe("Array.prototype 확장", () => {
  //#region 기본 체이닝

  describe("기본 체이닝", () => {
    it("기존 Array 메서드를 체이닝할 수 있다", () => {
      const result = [1, 2, 3, 4, 5].filter((x) => x > 2).map((x) => x * 10);

      expect(result).toEqual([30, 40, 50]);
    });

    it("확장 메서드를 체이닝할 수 있다", () => {
      const result = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ].toMap((x) => x.id);

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });

    it("Array 메서드와 확장 메서드를 혼합하여 체이닝할 수 있다", () => {
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

    it("여러 단계 체이닝이 가능하다", () => {
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

    it("배열 속성에 접근할 수 있다", () => {
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
    it("조건에 맞는 단일 요소를 반환한다", () => {
      const result = [1, 2, 3].single((x) => x === 2);

      expect(result).toBe(2);
    });

    it("조건에 맞는 요소가 없으면 undefined를 반환한다", () => {
      const result = [1, 2, 3].single((x) => x === 4);

      expect(result).toBe(undefined);
    });

    it("조건에 맞는 요소가 여러 개면 에러를 던진다", () => {
      expect(() => [1, 1, 2].single((x) => x === 1)).toThrow();
    });

    it("조건 없이 호출하면 배열 전체를 대상으로 한다", () => {
      expect([1].single()).toBe(1);
      expect(([] as number[]).single()).toBe(undefined);
      expect(() => [1, 2].single()).toThrow();
    });

    it("체이닝 후 single을 사용할 수 있다", () => {
      const result = [1, 2, 3, 4, 5].filter((x) => x > 3).single((x) => x === 4);

      expect(result).toBe(4);
    });
  });

  //#endregion

  //#region 비동기 메서드

  describe("parallelAsync()", () => {
    it("병렬 비동기 실행을 수행한다", async () => {
      const result = await [1, 2, 3].parallelAsync(async (x) => Promise.resolve(x * 2));

      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("mapAsync()", () => {
    it("비동기 순차 매핑을 수행한다", async () => {
      const result = await [1, 2, 3].mapAsync(async (x) => Promise.resolve(x * 2));

      expect(result).toEqual([2, 4, 6]);
    });

    it("체이닝 후 mapAsync를 사용할 수 있다", async () => {
      const result = await [1, 2, 3, 4, 5]
        .filter((x) => x > 2)
        .mapAsync(async (x) => Promise.resolve(x * 10));

      expect(result).toEqual([30, 40, 50]);
    });
  });

  describe("filterAsync()", () => {
    it("비동기 필터링을 수행한다", async () => {
      const result = await [1, 2, 3, 4, 5].filterAsync(async (x) => Promise.resolve(x > 2));

      expect(result).toEqual([3, 4, 5]);
    });
  });

  //#endregion

  //#region Map 변환

  describe("toMap()", () => {
    it("키 함수로 Map을 생성한다", () => {
      const result = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ].toMap((x) => x.id);

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });

    it("값 함수로 값을 변환한다", () => {
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

    it("키가 중복되면 에러를 던진다", () => {
      expect(() =>
        [
          { id: 1, name: "a" },
          { id: 1, name: "b" },
        ].toMap((x) => x.id),
      ).toThrow("키가 중복되었습니다");
    });
  });

  describe("toMapAsync()", () => {
    it("비동기 키/값 함수로 Map을 생성한다", async () => {
      const result = await [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ].toMapAsync(async (x) => Promise.resolve(x.id));

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });
  });

  describe("toArrayMap()", () => {
    it("배열 값을 가진 Map을 생성한다", () => {
      const result = [
        { type: "a", v: 1 },
        { type: "b", v: 2 },
        { type: "a", v: 3 },
      ].toArrayMap((x) => x.type);

      expect(result.get("a")).toHaveLength(2);
      expect(result.get("b")).toHaveLength(1);
    });

    it("값 함수로 값을 변환한다", () => {
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
    it("Set 값을 가진 Map을 생성한다", () => {
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
    it("그룹별 집계 결과를 Map으로 생성한다", () => {
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
    it("트리 구조로 변환한다", () => {
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
    it("배열 간 차이를 분석한다", () => {
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
    it("단방향 차이를 분석한다", () => {
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

    it("includeSame=true로 변경 없는 항목도 포함한다", () => {
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
    it("변경된 항목을 병합한다", () => {
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

  //#region ReadonlyArray 지원

  describe("ReadonlyArray 지원", () => {
    it("readonly 배열에서도 $를 사용할 수 있다", () => {
      const arr: readonly number[] = [1, 2, 3];
      const result = arr.filter((x) => x > 1).toMap((x) => x);

      expect(result.size).toBe(2);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
    });
  });

  //#endregion

  //#region 다양한 Array 메서드 체이닝

  describe("다양한 Array 메서드 체이닝", () => {
    it("flatMap을 체이닝할 수 있다", () => {
      const result = [
        [1, 2],
        [3, 4],
      ]
        .flatMap((x) => x)
        .toMap((x) => x);

      expect(result.size).toBe(4);
    });

    it("slice를 체이닝할 수 있다", () => {
      const result = [1, 2, 3, 4, 5].slice(1, 4).toMap((x) => x);

      expect(result.size).toBe(3);
      expect(result.has(2)).toBe(true);
      expect(result.has(3)).toBe(true);
      expect(result.has(4)).toBe(true);
    });

    it("concat을 체이닝할 수 있다", () => {
      const result = [1, 2].concat([3, 4]).toMap((x) => x);

      expect(result.size).toBe(4);
    });

    it("sort를 체이닝할 수 있다", () => {
      const result = [3, 1, 2].sort((a, b) => a - b).toMap((x, i) => i);

      expect(result.get(0)).toBe(1);
      expect(result.get(1)).toBe(2);
      expect(result.get(2)).toBe(3);
    });
  });

  //#endregion

  //#region first, last

  describe("first()", () => {
    it("첫 번째 요소를 반환한다", () => {
      expect([1, 2, 3].first()).toBe(1);
    });

    it("조건에 맞는 첫 번째 요소를 반환한다", () => {
      expect([1, 2, 3, 4, 5].first((x) => x > 3)).toBe(4);
    });

    it("빈 배열에서 undefined를 반환한다", () => {
      expect(([] as number[]).first()).toBe(undefined);
    });
  });

  describe("last()", () => {
    it("마지막 요소를 반환한다", () => {
      expect([1, 2, 3].last()).toBe(3);
    });

    it("조건에 맞는 마지막 요소를 반환한다", () => {
      expect([1, 2, 3, 4, 5].last((x) => x < 4)).toBe(3);
    });

    it("빈 배열에서 undefined를 반환한다", () => {
      expect(([] as number[]).last()).toBe(undefined);
    });
  });

  //#endregion

  //#region filterExists, ofType

  describe("filterExists()", () => {
    it("null/undefined를 제거한다", () => {
      const arr = [1, null, 2, undefined, 3];
      const result = arr.filterExists();
      expect(result).toEqual([1, 2, 3]);
    });

    it("체이닝이 가능하다", () => {
      const arr = [1, null, 2, undefined, 3];
      const result = arr.filterExists().map((x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("ofType()", () => {
    it("특정 타입의 요소만 필터링한다 (string)", () => {
      const arr = [1, "a", 2, "b", true];
      const result = arr.ofType("string");
      expect(result).toEqual(["a", "b"]);
    });

    it("특정 타입의 요소만 필터링한다 (number)", () => {
      const arr = [1, "a", 2, "b", 3];
      const result = arr.ofType("number");
      expect(result).toEqual([1, 2, 3]);
    });

    it("특정 타입의 요소만 필터링한다 (boolean)", () => {
      const arr = [1, "a", true, false, 2];
      const result = arr.ofType("boolean");
      expect(result).toEqual([true, false]);
    });
  });

  //#endregion

  //#region mapMany

  describe("mapMany()", () => {
    it("매핑 후 평탄화한다", () => {
      const result = [1, 2, 3].mapMany((x) => [x, x * 10]);
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });
  });

  describe("mapManyAsync()", () => {
    it("비동기 매핑 후 평탄화한다", async () => {
      const result = await [1, 2, 3].mapManyAsync(async (x) => Promise.resolve([x, x * 10]));
      expect(result).toEqual([1, 10, 2, 20, 3, 30]);
    });

    it("중첩 Promise 배열을 비동기 매핑 후 평탄화한다", async () => {
      const result = await [1, 2].mapManyAsync(async (x) => Promise.resolve([x, x + 1, x + 2]));
      expect(result).toEqual([1, 2, 3, 2, 3, 4]);
    });
  });

  //#endregion

  //#region groupBy

  describe("groupBy()", () => {
    it("키로 그룹화한다", () => {
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
    it("배열을 객체로 변환한다", () => {
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

    it("키가 중복되면 에러를 던진다", () => {
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
    it("중복을 제거한다", () => {
      expect([1, 2, 2, 3, 3, 3].distinct()).toEqual([1, 2, 3]);
    });

    it("객체 배열에서 중복을 제거한다", () => {
      const arr = [{ a: 1 }, { a: 2 }, { a: 1 }];
      const result = arr.distinct();
      expect(result).toHaveLength(2);
    });

    it("체이닝이 가능하다", () => {
      const result = [1, 2, 2, 3].distinct().map((x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });

    it("keyFn으로 커스텀 키를 사용할 수 있다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 1, name: "c" },
      ];
      const result = arr.distinct({ keyFn: (x) => x.id });
      expect(result).toHaveLength(2);
    });

    it("matchAddress=true로 참조 비교로 중복을 제거한다", () => {
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
    it("오름차순 정렬한다", () => {
      expect([3, 1, 2].orderBy()).toEqual([1, 2, 3]);
    });

    it("selector로 정렬 기준을 지정할 수 있다", () => {
      const items = [
        { name: "b", age: 30 },
        { name: "a", age: 20 },
        { name: "c", age: 25 },
      ];
      const result = items.orderBy((x) => x.age);
      expect(result.map((x) => x.age)).toEqual([20, 25, 30]);
    });

    it("체이닝이 가능하다", () => {
      const result = [3, 1, 2].orderBy().map((x) => x * 2);
      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("orderByDesc()", () => {
    it("내림차순 정렬한다", () => {
      expect([1, 3, 2].orderByDesc()).toEqual([3, 2, 1]);
    });
  });

  //#endregion

  //#region sum, min, max

  describe("sum()", () => {
    it("합계를 반환한다", () => {
      expect([1, 2, 3, 4, 5].sum()).toBe(15);
    });

    it("selector로 값을 추출할 수 있다", () => {
      const items = [{ value: 10 }, { value: 20 }, { value: 30 }];
      expect(items.sum((x) => x.value)).toBe(60);
    });

    it("빈 배열은 0을 반환한다", () => {
      expect(([] as number[]).sum()).toBe(0);
    });

    it("number가 아닌 타입에서 에러를 던진다", () => {
      expect(() => (["a", "b"] as unknown as number[]).sum()).toThrow("sum 은 number 에 대해서만");
    });
  });

  describe("min()", () => {
    it("최소값을 반환한다", () => {
      expect([3, 1, 2].min()).toBe(1);
    });

    it("빈 배열은 undefined를 반환한다", () => {
      expect(([] as number[]).min()).toBe(undefined);
    });

    it("number/string이 아닌 타입에서 에러를 던진다", () => {
      expect(() => ([true, false] as unknown as number[]).min()).toThrow(
        "min 은 number/string 에 대해서만",
      );
    });
  });

  describe("max()", () => {
    it("최대값을 반환한다", () => {
      expect([1, 3, 2].max()).toBe(3);
    });

    it("빈 배열은 undefined를 반환한다", () => {
      expect(([] as number[]).max()).toBe(undefined);
    });

    it("number/string이 아닌 타입에서 에러를 던진다", () => {
      expect(() => ([{}, {}] as unknown as number[]).max()).toThrow(
        "max 은 number/string 에 대해서만",
      );
    });
  });

  //#endregion

  //#region shuffle

  describe("shuffle()", () => {
    it("배열을 섞는다 (원본 유지)", () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = original.shuffle();

      // 원본은 변경되지 않음
      expect(original).toEqual([1, 2, 3, 4, 5]);
      // 같은 요소들을 가짐
      expect(shuffled.sort()).toEqual([1, 2, 3, 4, 5]);
    });
  });

  //#endregion

  //#region Mutable 메서드

  describe("distinctThis()", () => {
    it("원본 배열에서 중복을 제거한다", () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const result = arr.distinctThis();

      expect(arr).toEqual([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe("orderByThis()", () => {
    it("원본 배열을 오름차순 정렬한다", () => {
      const arr = [3, 1, 2];
      arr.orderByThis();

      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe("orderByDescThis()", () => {
    it("원본 배열을 내림차순 정렬한다", () => {
      const arr = [1, 3, 2];
      arr.orderByDescThis();

      expect(arr).toEqual([3, 2, 1]);
    });
  });

  describe("insert()", () => {
    it("원본 배열에 항목을 삽입한다", () => {
      const arr = [1, 3];
      arr.insert(1, 2);

      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe("remove()", () => {
    it("원본 배열에서 항목을 제거한다", () => {
      const arr = [1, 2, 3];
      arr.remove(2);

      expect(arr).toEqual([1, 3]);
    });

    it("조건 함수로 항목을 제거한다", () => {
      const arr = [1, 2, 3, 4];
      arr.remove((x) => x % 2 === 0);

      expect(arr).toEqual([1, 3]);
    });
  });

  describe("toggle()", () => {
    it("항목이 있으면 제거한다", () => {
      const arr = [1, 2, 3];
      arr.toggle(2);

      expect(arr).toEqual([1, 3]);
    });

    it("항목이 없으면 추가한다", () => {
      const arr = [1, 3];
      arr.toggle(2);

      expect(arr).toEqual([1, 3, 2]);
    });
  });

  describe("clear()", () => {
    it("원본 배열을 비운다", () => {
      const arr = [1, 2, 3];
      arr.clear();

      expect(arr).toEqual([]);
    });
  });

  //#endregion
});
