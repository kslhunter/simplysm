import { describe, it, expect } from "vitest";
import { pipe, filter } from "remeda";
import {
  pipeAsync,
  arrSingle as single,
  arrParallelAsync as parallelAsync,
  arrMapAsync as mapAsync,
  arrFilterAsync as filterAsync,
  arrToMap as toMap,
  arrToMapAsync as toMapAsync,
  arrToArrayMap as toArrayMap,
  arrToSetMap as toSetMap,
  arrToMapValues as toMapValues,
  arrToTree as toTree,
  arrDiffs as diffs,
  arrOneWayDiffs as oneWayDiffs,
  arrMerge as merge,
} from "@simplysm/core-common";

describe("array-utils", () => {
  //#region single

  describe("single()", () => {
    it("조건에 맞는 단일 요소를 반환한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = single(arr, (item) => item.id === 2);

      expect(result).toEqual({ id: 2, name: "b" });
    });

    it("조건에 맞는 요소가 없으면 undefined를 반환한다", () => {
      const arr = [{ id: 1 }, { id: 2 }];
      const result = single(arr, (item) => item.id === 3);

      expect(result).toBe(undefined);
    });

    it("조건에 맞는 요소가 여러 개면 에러를 던진다", () => {
      const arr = [{ id: 1 }, { id: 1 }];

      expect(() => single(arr, (item) => item.id === 1)).toThrow();
    });

    it("빈 배열은 undefined를 반환한다", () => {
      const arr: { id: number }[] = [];
      const result = single(arr, (item) => item.id === 1);

      expect(result).toBe(undefined);
    });

    it("조건 없이 호출하면 배열 전체를 대상으로 한다", () => {
      expect(single([1])).toBe(1);
      expect(single([])).toBe(undefined);
      expect(() => single([1, 2])).toThrow();
    });
  });

  //#endregion

  //#region 비동기

  describe("parallelAsync()", () => {
    it("병렬 비동기 실행을 수행한다", async () => {
      const arr = [1, 2, 3];
      const result = await parallelAsync(arr, async (item) => Promise.resolve(item * 2));

      expect(result).toEqual([2, 4, 6]);
    });

    it("빈 배열은 빈 배열을 반환한다", async () => {
      const result = await parallelAsync([], (item) => Promise.resolve(item));

      expect(result).toEqual([]);
    });
  });

  describe("mapAsync()", () => {
    it("비동기 순차 매핑을 수행한다", async () => {
      const arr = [1, 2, 3];
      const result = await mapAsync(arr, async (item) => Promise.resolve(item * 2));

      expect(result).toEqual([2, 4, 6]);
    });

    it("인덱스를 전달받는다", async () => {
      const arr = ["a", "b", "c"];
      const result = await mapAsync(arr, (item, index) => Promise.resolve(`${item}-${index}`));

      expect(result).toEqual(["a-0", "b-1", "c-2"]);
    });
  });

  describe("filterAsync()", () => {
    it("비동기 필터링을 수행한다", async () => {
      const arr = [1, 2, 3, 4, 5];
      const result = await filterAsync(arr, async (item) => Promise.resolve(item > 2));

      expect(result).toEqual([3, 4, 5]);
    });

    it("인덱스를 전달받는다", async () => {
      const arr = ["a", "b", "c", "d"];
      const result = await filterAsync(arr, (_, index) => Promise.resolve(index % 2 === 0));

      expect(result).toEqual(["a", "c"]);
    });
  });

  //#endregion

  //#region Map 변환

  describe("toMap()", () => {
    it("키 함수로 Map을 생성한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = toMap(arr, (item) => item.id);

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });

    it("값 함수로 값을 변환한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = toMap(
        arr,
        (item) => item.id,
        (item) => item.name,
      );

      expect(result.get(1)).toBe("a");
      expect(result.get(2)).toBe("b");
    });

    it("키가 중복되면 에러를 던진다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 1, name: "b" },
      ];

      expect(() => toMap(arr, (item) => item.id)).toThrow("키가 중복되었습니다");
    });

    it("인덱스를 전달받는다", () => {
      const arr = ["a", "b", "c"];
      const result = toMap(
        arr,
        (_, index) => index,
        (item) => item,
      );

      expect(result.get(0)).toBe("a");
      expect(result.get(1)).toBe("b");
      expect(result.get(2)).toBe("c");
    });
  });

  describe("toMapAsync()", () => {
    it("비동기 키/값 함수로 Map을 생성한다", async () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = await toMapAsync(arr, async (item) => Promise.resolve(item.id));

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
    });

    it("비동기 값 변환을 수행한다", async () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = await toMapAsync(
        arr,
        async (item) => Promise.resolve(item.id),
        async (item) => Promise.resolve(item.name.toUpperCase()),
      );

      expect(result.get(1)).toBe("A");
      expect(result.get(2)).toBe("B");
    });

    it("키가 중복되면 에러를 던진다", async () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 1, name: "b" },
      ];

      await expect(toMapAsync(arr, (item) => Promise.resolve(item.id))).rejects.toThrow("키가 중복되었습니다");
    });
  });

  describe("toArrayMap()", () => {
    it("키 함수로 배열 값을 가진 Map을 생성한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
        { category: "a", value: 3 },
      ];
      const result = toArrayMap(arr, (item) => item.category);

      expect(result.get("a")).toHaveLength(2);
      expect(result.get("b")).toHaveLength(1);
    });

    it("값 함수로 값을 변환한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "a", value: 2 },
      ];
      const result = toArrayMap(
        arr,
        (item) => item.category,
        (item) => item.value,
      );

      expect(result.get("a")).toEqual([1, 2]);
    });
  });

  describe("toSetMap()", () => {
    it("Set 값을 가진 Map을 생성한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
        { category: "a", value: 3 },
      ];
      const result = toSetMap(arr, (item) => item.category);

      expect(result.get("a")?.size).toBe(2);
      expect(result.get("b")?.size).toBe(1);
    });

    it("값 함수로 Set 값을 변환한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "a", value: 1 }, // 중복
        { category: "a", value: 2 },
      ];
      const result = toSetMap(
        arr,
        (item) => item.category,
        (item) => item.value,
      );

      expect(result.get("a")?.size).toBe(2); // Set이므로 중복 제거
    });
  });

  describe("toMapValues()", () => {
    it("그룹별 집계 결과를 Map으로 생성한다", () => {
      const arr = [
        { category: "a", value: 10 },
        { category: "b", value: 20 },
        { category: "a", value: 30 },
      ];
      const result = toMapValues(
        arr,
        (item) => item.category,
        (items) => items.reduce((sum, item) => sum + item.value, 0),
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

      const arr: Item[] = [
        { id: 1, name: "root" },
        { id: 2, parentId: 1, name: "child1" },
        { id: 3, parentId: 1, name: "child2" },
        { id: 4, parentId: 2, name: "grandchild" },
      ];

      const result = toTree(arr, "id", "parentId");

      expect(result).toHaveLength(1); // root 1개
      expect(result[0].children).toHaveLength(2); // child1, child2
      expect(result[0].children[0].children).toHaveLength(1); // grandchild
    });

    it("여러 루트가 있을 수 있다", () => {
      const arr = [
        { id: 1, parentId: undefined, name: "root1" },
        { id: 2, parentId: undefined, name: "root2" },
        { id: 3, parentId: 1, name: "child1" },
      ];

      const result = toTree(arr, "id", "parentId");

      expect(result).toHaveLength(2);
    });

    it("빈 배열은 빈 배열을 반환한다", () => {
      const result = toTree([], "id", "parentId");

      expect(result).toEqual([]);
    });
  });

  //#endregion

  //#region 차이 분석

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

      const result = diffs(source, target, { keys: ["id"] });

      const deleted = result.find((d) => d.source?.id === 1);
      expect(deleted?.target).toBe(undefined);

      const updated = result.find((d) => d.source?.id === 3);
      expect(updated?.target?.value).toBe("changed");

      const inserted = result.find((d) => d.target?.id === 4);
      expect(inserted?.source).toBe(undefined);
    });

    it("keys 없이 전체 비교를 수행한다", () => {
      const source = [{ a: 1, b: 2 }];
      const target = [{ a: 1, b: 3 }];

      const result = diffs(source, target);

      // 전체 비교 시 다른 항목으로 취급
      expect(result).toHaveLength(2); // delete + insert
    });

    it("excludes 옵션으로 비교 제외 가능", () => {
      const source = [{ id: 1, value: "a", timestamp: 100 }];
      const target = [{ id: 1, value: "a", timestamp: 200 }];

      const result = diffs(source, target, { excludes: ["timestamp"] });

      // timestamp 제외하면 같은 항목
      expect(result).toHaveLength(0);
    });
  });

  describe("oneWayDiffs()", () => {
    it("단방향 차이를 분석한다 (create/update)", () => {
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

      const result = oneWayDiffs(items, orgItems, "id");

      const updated = result.find((d) => d.item.id === 2);
      expect(updated?.type).toBe("update");

      const created = result.find((d) => d.item.id === 3);
      expect(created?.type).toBe("create");
    });

    it("includeSame 옵션으로 같은 항목도 포함한다", () => {
      const orgItems = [{ id: 1, value: "a" }];
      const items = [{ id: 1, value: "a" }];

      const result = oneWayDiffs(items, orgItems, "id", { includeSame: true });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("same");
    });

    it("Map 파라미터를 사용할 수 있다", () => {
      interface Item {
        id: number;
        value: string;
      }

      const orgMap = new Map<number, Item>([
        [1, { id: 1, value: "a" }],
        [2, { id: 2, value: "b" }],
      ]);

      const items: Item[] = [
        { id: 2, value: "changed" },
        { id: 3, value: "c" },
      ];

      const result = oneWayDiffs(items, orgMap, "id");

      const updated = result.find((d) => d.item.id === 2);
      expect(updated?.type).toBe("update");

      const created = result.find((d) => d.item.id === 3);
      expect(created?.type).toBe("create");
    });

    it("keyValue가 null인 경우 create로 처리한다", () => {
      interface Item {
        id: number | undefined;
        value: string;
      }

      const orgItems: Item[] = [
        { id: 1, value: "a" },
        { id: 2, value: "b" },
      ];

      const items: Item[] = [
        { id: undefined, value: "new" },
        { id: 2, value: "changed" },
      ];

      const result = oneWayDiffs(items, orgItems, "id");

      const created = result.find((d) => d.item.id === undefined);
      expect(created?.type).toBe("create");

      const updated = result.find((d) => d.item.id === 2);
      expect(updated?.type).toBe("update");
    });

    it("excludes 옵션으로 비교 시 특정 키를 제외한다", () => {
      interface Item {
        id: number;
        value: string;
        timestamp: number;
      }

      const orgItems: Item[] = [{ id: 1, value: "a", timestamp: 100 }];

      const items: Item[] = [{ id: 1, value: "a", timestamp: 200 }];

      // timestamp를 제외하면 같은 항목으로 취급
      const result = oneWayDiffs(items, orgItems, "id", {
        excludes: ["timestamp"],
        includeSame: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("same");
    });

    it("includes 옵션으로 특정 키만 비교한다", () => {
      interface Item {
        id: number;
        value: string;
        other: string;
      }

      const orgItems: Item[] = [{ id: 1, value: "a", other: "x" }];

      const items: Item[] = [{ id: 1, value: "a", other: "changed" }];

      // value만 비교하면 같은 항목으로 취급
      const result = oneWayDiffs(items, orgItems, "id", {
        includes: ["id", "value"],
        includeSame: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("same");
    });

    it("함수로 키를 추출할 수 있다", () => {
      const orgItems = [{ id: 1, value: "a" }];
      const items = [{ id: 1, value: "changed" }];

      const result = oneWayDiffs(items, orgItems, (item) => item.id);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("update");
    });
  });

  //#endregion

  //#region 병합

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

      const result = merge(source, target, { keys: ["id"] });

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.id === 2)?.value).toBe("changed");
    });

    it("새 항목을 추가한다", () => {
      interface Item {
        id: number;
        value: string;
      }

      const source: Item[] = [{ id: 1, value: "a" }];
      const target: Item[] = [
        { id: 1, value: "a" },
        { id: 2, value: "b" },
      ];

      const result = merge(source, target, { keys: ["id"] });

      expect(result).toHaveLength(2);
      expect(result.find((r) => r.id === 2)?.value).toBe("b");
    });

    it("keys 옵션으로 변경 여부를 판단한다", () => {
      interface Item {
        id: number;
        name: string;
        count: number;
      }

      const source: Item[] = [{ id: 1, name: "item1", count: 10 }];
      const target: Item[] = [{ id: 1, name: "item1", count: 20 }];

      const result = merge(source, target, { keys: ["id"] });

      // id가 같으므로 target 값으로 병합됨
      expect(result[0].count).toBe(20);
    });

    it("excludes 옵션으로 비교 시 특정 키를 제외한다", () => {
      interface Item {
        id: number;
        value: string;
        timestamp: number;
      }

      const source: Item[] = [{ id: 1, value: "a", timestamp: 100 }];
      const target: Item[] = [{ id: 1, value: "a", timestamp: 200 }];

      // timestamp를 제외하면 같은 항목으로 취급
      const result = merge(source, target, { excludes: ["timestamp"] });

      expect(result).toHaveLength(1);
      // 같은 항목이므로 source 값 유지
      expect(result[0].timestamp).toBe(100);
    });

    it("원본 배열을 변경하지 않는다", () => {
      const source = [{ id: 1, value: "a" }];
      const target = [{ id: 2, value: "b" }];

      merge(source, target, { keys: ["id"] });

      expect(source).toHaveLength(1);
      expect(source[0].value).toBe("a");
    });

    it("primitive 배열도 병합한다", () => {
      const source = [1, 2, 3];
      const target = [3, 4, 5];

      const result = merge(source, target);

      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContain(3);
      expect(result).toContain(4);
      expect(result).toContain(5);
    });
  });

  //#endregion

  //#region pipeAsync

  describe("pipeAsync()", () => {
    it("동기 함수를 파이프라인으로 연결한다", async () => {
      const result = await pipeAsync(
        [1, 2, 3],
        (arr) => arr.map((x) => x * 2),
      );

      expect(result).toEqual([2, 4, 6]);
    });

    it("비동기 함수를 파이프라인으로 연결한다", async () => {
      const result = await pipeAsync(
        [1, 2, 3],
        (arr) => Promise.resolve(arr.map((x) => x * 2)),
      );

      expect(result).toEqual([2, 4, 6]);
    });

    it("동기/비동기 함수를 혼합하여 사용할 수 있다", async () => {
      const result = await pipeAsync(
        [1, 2, 3, 4, 5],
        (arr) => arr.filter((x) => x > 2), // 동기
        (arr) => Promise.resolve(arr.map((x) => x * 10)), // 비동기
        (arr) => arr.reduce((sum, x) => sum + x, 0), // 동기
      );

      expect(result).toBe(120); // (3 + 4 + 5) * 10 = 120
    });

    it("array-utils 비동기 함수와 함께 사용할 수 있다 (data-last)", async () => {
      const result = await pipeAsync(
        [1, 2, 3, 4, 5],
        filterAsync(async (x) => Promise.resolve(x > 2)),
        mapAsync(async (x) => Promise.resolve(x * 10)),
      );

      expect(result).toEqual([30, 40, 50]);
    });

    it("여러 단계의 파이프라인을 처리한다", async () => {
      const result = await pipeAsync(
        1,
        (x) => x + 1,
        (x) => Promise.resolve(x * 2),
        (x) => x + 10,
        (x) => Promise.resolve(x * 3),
        (x) => x.toString(),
      );

      expect(result).toBe("42"); // ((1+1)*2+10)*3 = 42
    });
  });

  //#endregion

  //#region data-last (pipe 호환)

  describe("data-last 패턴 (pipe 호환)", () => {
    describe("single() data-last", () => {
      it("pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [1, 2, 3],
          filter((x) => x === 2),
          single(),
        );

        expect(result).toBe(2);
      });

      it("predicate와 함께 pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [1, 2, 3],
          single((x) => x === 2),
        );

        expect(result).toBe(2);
      });
    });

    describe("toMap() data-last", () => {
      it("pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
          ],
          toMap((x) => x.id),
        );

        expect(result.get(1)).toEqual({ id: 1, name: "a" });
        expect(result.get(2)).toEqual({ id: 2, name: "b" });
      });

      it("valueSelector와 함께 pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
          ],
          toMap(
            (x) => x.id,
            (x) => x.name,
          ),
        );

        expect(result.get(1)).toBe("a");
        expect(result.get(2)).toBe("b");
      });
    });

    describe("toArrayMap() data-last", () => {
      it("pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [
            { type: "a", v: 1 },
            { type: "b", v: 2 },
            { type: "a", v: 3 },
          ],
          toArrayMap((x) => x.type),
        );

        expect(result.get("a")).toHaveLength(2);
        expect(result.get("b")).toHaveLength(1);
      });
    });

    describe("toSetMap() data-last", () => {
      it("pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [
            { type: "a", v: 1 },
            { type: "a", v: 1 }, // 중복
            { type: "b", v: 2 },
          ],
          toSetMap(
            (x) => x.type,
            (x) => x.v,
          ),
        );

        expect(result.get("a")?.size).toBe(1); // Set이므로 중복 제거
        expect(result.get("b")?.size).toBe(1);
      });
    });

    describe("toMapValues() data-last", () => {
      it("pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [
            { type: "a", v: 10 },
            { type: "b", v: 20 },
            { type: "a", v: 30 },
          ],
          toMapValues(
            (x) => x.type,
            (items) => items.reduce((sum, x) => sum + x.v, 0),
          ),
        );

        expect(result.get("a")).toBe(40);
        expect(result.get("b")).toBe(20);
      });
    });

    describe("toTree() data-last", () => {
      it("pipe에서 사용할 수 있다", () => {
        interface Item {
          id: number;
          parentId?: number;
          name: string;
        }

        const result = pipe(
          [
            { id: 1, name: "root" } as Item,
            { id: 2, parentId: 1, name: "child1" } as Item,
            { id: 3, parentId: 1, name: "child2" } as Item,
          ],
          toTree("id", "parentId"),
        );

        expect(result).toHaveLength(1);
        expect(result[0].children).toHaveLength(2);
      });
    });

    describe("parallelAsync() data-last", () => {
      it("pipeAsync에서 사용할 수 있다", async () => {
        const result = await pipeAsync(
          [1, 2, 3],
          parallelAsync(async (x) => Promise.resolve(x * 2)),
        );

        expect(result).toEqual([2, 4, 6]);
      });
    });

    describe("mapAsync() data-last", () => {
      it("pipeAsync에서 사용할 수 있다", async () => {
        const result = await pipeAsync(
          [1, 2, 3],
          mapAsync(async (x) => Promise.resolve(x * 2)),
        );

        expect(result).toEqual([2, 4, 6]);
      });
    });

    describe("filterAsync() data-last", () => {
      it("pipeAsync에서 사용할 수 있다", async () => {
        const result = await pipeAsync(
          [1, 2, 3, 4, 5],
          filterAsync(async (x) => Promise.resolve(x > 2)),
        );

        expect(result).toEqual([3, 4, 5]);
      });
    });

    describe("toMapAsync() data-last", () => {
      it("pipeAsync에서 사용할 수 있다", async () => {
        const result = await pipeAsync(
          [
            { id: 1, name: "a" },
            { id: 2, name: "b" },
          ],
          toMapAsync(async (x) => Promise.resolve(x.id)),
        );

        expect(result.get(1)).toEqual({ id: 1, name: "a" });
        expect(result.get(2)).toEqual({ id: 2, name: "b" });
      });
    });

    describe("혼합 사용", () => {
      it("Remeda와 array-utils를 함께 pipe에서 사용할 수 있다", () => {
        const result = pipe(
          [
            { id: 1, name: "a", active: true },
            { id: 2, name: "b", active: false },
            { id: 3, name: "c", active: true },
          ],
          filter((x) => x.active), // Remeda
          toMap((x) => x.id), // array-utils
        );

        expect(result.size).toBe(2);
        expect(result.has(1)).toBe(true);
        expect(result.has(3)).toBe(true);
        expect(result.has(2)).toBe(false);
      });

      it("pipeAsync에서 동기/비동기 함수를 혼합할 수 있다", async () => {
        const result = await pipeAsync(
          [1, 2, 3, 4, 5],
          filterAsync(async (x) => Promise.resolve(x > 2)), // 비동기
          (arr) => arr.map((x) => x * 10), // 동기
          toMap((x) => x), // 동기 (array-utils)
        );

        expect(result.size).toBe(3);
        expect(result.has(30)).toBe(true);
        expect(result.has(40)).toBe(true);
        expect(result.has(50)).toBe(true);
      });
    });
  });

  //#endregion
});
