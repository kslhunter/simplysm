import { describe, it, expect } from "vitest";
import "@simplysm/core-common";

describe("Array.ext", () => {
  //#region 정렬

  describe("orderBy()", () => {
    it("단일 키로 오름차순 정렬한다", () => {
      const arr = [{ a: 3 }, { a: 1 }, { a: 2 }];
      const result = arr.orderBy((item) => item.a);

      expect(result.map((item) => item.a)).toEqual([1, 2, 3]);
    });

    it("원본 배열을 변경하지 않는다", () => {
      const arr = [{ a: 3 }, { a: 1 }, { a: 2 }];
      arr.orderBy((item) => item.a);

      expect(arr.map((item) => item.a)).toEqual([3, 1, 2]);
    });
  });

  describe("orderByDesc()", () => {
    it("단일 키로 내림차순 정렬한다", () => {
      const arr = [{ a: 1 }, { a: 3 }, { a: 2 }];
      const result = arr.orderByDesc((item) => item.a);

      expect(result.map((item) => item.a)).toEqual([3, 2, 1]);
    });
  });

  //#endregion

  //#region 필터링

  describe("distinct()", () => {
    it("중복을 제거한다 (primitive)", () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const result = arr.distinct();

      expect(result).toEqual([1, 2, 3]);
    });

    it("matchAddress: true로 주소 기반 중복을 제거한다", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const arr = [obj1, obj2, obj1];
      const result = arr.distinct(true);

      expect(result).toHaveLength(2);
    });

    it("문자열 키로 최적화된다", () => {
      const arr = ["a", "b", "a", "c", "b"];
      const result = arr.distinct();

      expect(result).toEqual(["a", "b", "c"]);
    });

    it("keyFn으로 커스텀 키 기반 중복 제거", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
        { id: 1, name: "c" },
      ];
      const result = arr.distinct({ keyFn: (item) => item.id });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("a"); // 첫 번째 id:1 유지
      expect(result[1].name).toBe("b");
    });

    it("options 객체로 matchAddress 전달", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const arr = [obj1, obj2, obj1];
      const result = arr.distinct({ matchAddress: true });

      expect(result).toHaveLength(2);
    });
  });

  describe("filterExists()", () => {
    it("null과 undefined를 제외한 요소만 반환한다", () => {
      const arr = [1, null, 2, undefined, 3];
      const result = arr.filterExists();

      expect(result).toEqual([1, 2, 3]);
    });

    it("모든 요소가 존재하면 그대로 반환한다", () => {
      const arr = [1, 2, 3];
      const result = arr.filterExists();

      expect(result).toEqual([1, 2, 3]);
    });

    it("빈 배열은 빈 배열을 반환한다", () => {
      const arr: (number | null)[] = [];
      const result = arr.filterExists();

      expect(result).toEqual([]);
    });

    it("0과 빈 문자열은 유지한다", () => {
      const arr = [0, "", null, undefined, false];
      const result = arr.filterExists();

      expect(result).toEqual([0, "", false]);
    });
  });

  describe("ofType()", () => {
    it("지정한 클래스의 인스턴스만 필터링한다", () => {
      class Dog {
        name = "dog";
      }
      class Cat {
        name = "cat";
      }

      const dog1 = new Dog();
      const dog2 = new Dog();
      const cat1 = new Cat();

      const arr = [dog1, cat1, dog2];
      const result = arr.ofType(Dog);

      expect(result).toHaveLength(2);
      expect(result).toContain(dog1);
      expect(result).toContain(dog2);
    });

    it("일치하는 타입이 없으면 빈 배열을 반환한다", () => {
      class Dog {
        name = "dog";
      }
      class Cat {
        name = "cat";
      }

      const dog = new Dog();
      const arr = [dog];
      const result = arr.ofType(Cat);

      expect(result).toEqual([]);
    });

    it("내장 타입도 필터링한다", () => {
      const arr = [1, "a", 2, "b", 3];
      const result = arr.ofType(String);

      expect(result).toEqual(["a", "b"]);
    });
  });

  //#endregion

  //#region 검색

  describe("single()", () => {
    it("조건에 맞는 단일 요소를 반환한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = arr.single((item) => item.id === 2);

      expect(result).toEqual({ id: 2, name: "b" });
    });

    it("조건에 맞는 요소가 없으면 undefined를 반환한다", () => {
      const arr = [{ id: 1 }, { id: 2 }];
      const result = arr.single((item) => item.id === 3);

      expect(result).toBe(undefined);
    });

    it("조건에 맞는 요소가 여러 개면 에러를 던진다", () => {
      const arr = [{ id: 1 }, { id: 1 }];

      expect(() => arr.single((item) => item.id === 1)).toThrow();
    });
  });

  describe("first()", () => {
    it("조건 없이 첫 번째 요소를 반환한다", () => {
      const arr = [1, 2, 3];
      const result = arr.first();

      expect(result).toBe(1);
    });

    it("조건에 맞는 첫 번째 요소를 반환한다", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.first((item) => item > 2);

      expect(result).toBe(3);
    });

    it("조건에 맞는 요소가 없으면 undefined를 반환한다", () => {
      const arr = [1, 2, 3];
      const result = arr.first((item) => item > 10);

      expect(result).toBe(undefined);
    });

    it("빈 배열에서 undefined를 반환한다", () => {
      const arr: number[] = [];
      const result = arr.first();

      expect(result).toBe(undefined);
    });
  });

  describe("last()", () => {
    it("조건에 맞는 마지막 요소를 반환한다", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.last((item) => item < 4);

      expect(result).toBe(3);
    });

    it("조건 없이 마지막 요소를 반환한다", () => {
      const arr = [1, 2, 3];
      const result = arr.last();

      expect(result).toBe(3);
    });
  });

  //#endregion

  //#region 집계

  describe("sum()", () => {
    it("숫자 배열의 합을 구한다", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.sum();

      expect(result).toBe(15);
    });

    it("키 함수로 합을 구한다", () => {
      const arr = [{ value: 10 }, { value: 20 }, { value: 30 }];
      const result = arr.sum((item) => item.value);

      expect(result).toBe(60);
    });
  });

  describe("min()", () => {
    it("최솟값을 반환한다", () => {
      const arr = [3, 1, 4, 1, 5];
      const result = arr.min();

      expect(result).toBe(1);
    });

    it("키 함수로 최솟값을 반환한다", () => {
      const arr = [{ value: 30 }, { value: 10 }, { value: 20 }];
      const result = arr.min((item) => item.value);

      expect(result).toBe(10);
    });
  });

  describe("max()", () => {
    it("최댓값을 반환한다", () => {
      const arr = [3, 1, 4, 1, 5];
      const result = arr.max();

      expect(result).toBe(5);
    });

    it("키 함수로 최댓값을 반환한다", () => {
      const arr = [{ value: 30 }, { value: 10 }, { value: 20 }];
      const result = arr.max((item) => item.value);

      expect(result).toBe(30);
    });
  });


  //#endregion

  //#region 그룹화

  describe("groupBy()", () => {
    it("키 함수로 그룹화한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
        { category: "a", value: 3 },
      ];
      const result = arr.groupBy((item) => item.category);

      expect(result).toHaveLength(2);
      expect(result.find((g) => g.key === "a")?.values).toHaveLength(2);
      expect(result.find((g) => g.key === "b")?.values).toHaveLength(1);
    });
  });

  describe("toMap()", () => {
    it("키 함수로 Map을 생성한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = arr.toMap((item) => item.id);

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
      expect(result.get(2)).toEqual({ id: 2, name: "b" });
    });

    it("값 함수로 값을 변환한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = arr.toMap(
        (item) => item.id,
        (item) => item.name,
      );

      expect(result.get(1)).toBe("a");
      expect(result.get(2)).toBe("b");
    });
  });

  describe("toArrayMap()", () => {
    it("키 함수로 배열 값을 가진 Map을 생성한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
        { category: "a", value: 3 },
      ];
      const result = arr.toArrayMap((item) => item.category);

      expect(result.get("a")).toHaveLength(2);
      expect(result.get("b")).toHaveLength(1);
    });
  });

  //#endregion

  //#region 조작

  describe("mapMany()", () => {
    it("중첩 배열을 평탄화한다", () => {
      const arr = [
        { items: [1, 2] },
        { items: [3, 4] },
      ];
      const result = arr.mapMany((item) => item.items);

      expect(result).toEqual([1, 2, 3, 4]);
    });
  });

  describe("insert()", () => {
    it("지정한 위치에 요소를 삽입한다", () => {
      const arr = [1, 2, 4, 5];
      const result = arr.insert(2, 3);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe("remove()", () => {
    it("조건에 맞는 요소를 제거한다 (원본 변경)", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.remove((item) => item === 3);

      // remove는 원본을 변경하고 this를 반환
      expect(result).toBe(arr);
      expect(arr).toEqual([1, 2, 4, 5]);
    });

    it("특정 값을 제거한다", () => {
      const arr = [1, 2, 3, 2, 4];
      arr.remove(2);

      expect(arr).toEqual([1, 3, 4]);
    });
  });

  //#endregion

  //#region 비동기

  describe("filterAsync()", () => {
    it("비동기 필터링을 수행한다", async () => {
      const arr = [1, 2, 3, 4, 5];
      const result = await arr.filterAsync(async (item) => item > 2);

      expect(result).toEqual([3, 4, 5]);
    });
  });

  describe("mapAsync()", () => {
    it("비동기 매핑을 수행한다", async () => {
      const arr = [1, 2, 3];
      const result = await arr.mapAsync(async (item) => item * 2);

      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("parallelAsync()", () => {
    it("병렬 비동기 실행을 수행한다", async () => {
      const arr = [1, 2, 3];
      const result = await arr.parallelAsync(async (item) => item * 2);

      expect(result).toEqual([2, 4, 6]);
    });
  });

  describe("mapManyAsync()", () => {
    it("비동기 flatMap을 수행한다", async () => {
      const arr = [
        { items: [1, 2] },
        { items: [3, 4] },
      ];
      const result = await arr.mapManyAsync(async (item) => item.items);

      expect(result).toEqual([1, 2, 3, 4]);
    });
  });

  //#endregion

  //#region 변환

  describe("toObject()", () => {
    it("객체로 변환한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = arr.toObject((item) => item.id.toString());

      expect(result).toEqual({
        "1": { id: 1, name: "a" },
        "2": { id: 2, name: "b" },
      });
    });

    it("값 함수로 변환한다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = arr.toObject(
        (item) => item.id.toString(),
        (item) => item.name,
      );

      expect(result).toEqual({ "1": "a", "2": "b" });
    });

    it("키가 중복되면 에러를 던진다", () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 1, name: "b" },
      ];

      expect(() => arr.toObject((item) => item.id.toString())).toThrow("키가 중복되었습니다");
    });
  });

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

      const result = arr.toTree("id", "parentId");

      expect(result).toHaveLength(1); // root 1개
      expect(result[0].children).toHaveLength(2); // child1, child2
      expect(result[0].children[0].children).toHaveLength(1); // grandchild
    });
  });

  describe("toSetMap()", () => {
    it("Set 값을 가진 Map을 생성한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "b", value: 2 },
        { category: "a", value: 3 },
      ];
      const result = arr.toSetMap((item) => item.category);

      expect(result.get("a")?.size).toBe(2);
      expect(result.get("b")?.size).toBe(1);
    });

    it("값 함수로 Set 값을 변환한다", () => {
      const arr = [
        { category: "a", value: 1 },
        { category: "a", value: 1 }, // 중복
        { category: "a", value: 2 },
      ];
      const result = arr.toSetMap(
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
      const result = arr.toMapValues(
        (item) => item.category,
        (items) => items.sum((item) => item.value),
      );

      expect(result.get("a")).toBe(40);
      expect(result.get("b")).toBe(20);
    });
  });

  describe("toMapAsync()", () => {
    it("비동기 키/값 함수로 Map을 생성한다", async () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = await arr.toMapAsync(async (item) => item.id);

      expect(result.get(1)).toEqual({ id: 1, name: "a" });
    });

    it("비동기 값 변환을 수행한다", async () => {
      const arr = [
        { id: 1, name: "a" },
        { id: 2, name: "b" },
      ];
      const result = await arr.toMapAsync(
        async (item) => item.id,
        async (item) => item.name.toUpperCase(),
      );

      expect(result.get(1)).toBe("A");
      expect(result.get(2)).toBe("B");
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

      const result = items.oneWayDiffs(orgItems, "id");

      const updated = result.find((d) => d.item.id === 2);
      expect(updated?.type).toBe("update");

      const created = result.find((d) => d.item.id === 3);
      expect(created?.type).toBe("create");
    });

    it("includeSame 옵션으로 같은 항목도 포함한다", () => {
      const orgItems = [{ id: 1, value: "a" }];
      const items = [{ id: 1, value: "a" }];

      const result = items.oneWayDiffs(orgItems, "id", { includeSame: true });

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

      const result = items.oneWayDiffs(orgMap, "id");

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

      const result = items.oneWayDiffs(orgItems, "id");

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
      const result = items.oneWayDiffs(orgItems, "id", {
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
      const result = items.oneWayDiffs(orgItems, "id", {
        includes: ["id", "value"],
        includeSame: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("same");
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

      const result = source.merge(target, { keys: ["id"] });

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

      const result = source.merge(target, { keys: ["id"] });

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

      const result = source.merge(target, { keys: ["id"] });

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
      const result = source.merge(target, { excludes: ["timestamp"] });

      expect(result).toHaveLength(1);
      // 같은 항목이므로 source 값 유지
      expect(result[0].timestamp).toBe(100);
    });

    it("원본 배열을 변경하지 않는다", () => {
      const source = [{ id: 1, value: "a" }];
      const target = [{ id: 2, value: "b" }];

      source.merge(target, { keys: ["id"] });

      expect(source).toHaveLength(1);
      expect(source[0].value).toBe("a");
    });

    it("primitive 배열도 병합한다", () => {
      const source = [1, 2, 3];
      const target = [3, 4, 5];

      const result = source.merge(target);

      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContain(3);
      expect(result).toContain(4);
      expect(result).toContain(5);
    });
  });

  //#endregion

  //#region 랜덤

  describe("shuffle()", () => {
    it("배열을 섞는다", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.shuffle();

      // 원본 불변
      expect(arr).toEqual([1, 2, 3, 4, 5]);

      // 같은 요소를 가지고 있는지 확인
      expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
    });

    it("빈 배열은 빈 배열을 반환한다", () => {
      const arr: number[] = [];
      const result = arr.shuffle();

      expect(result).toEqual([]);
    });
  });

  //#endregion

  //#region 원본 변경

  describe("distinctThis()", () => {
    it("원본 배열에서 중복을 제거한다", () => {
      const arr = [1, 2, 2, 3, 3, 3];
      const result = arr.distinctThis();

      expect(result).toBe(arr); // 원본 반환
      expect(arr).toEqual([1, 2, 3]);
    });

    it("matchAddress로 주소 기반 중복을 제거한다", () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const arr = [obj1, obj2, obj1];

      arr.distinctThis(true);

      expect(arr).toHaveLength(2);
    });
  });

  describe("orderByThis()", () => {
    it("원본 배열을 오름차순 정렬한다", () => {
      const arr = [{ a: 3 }, { a: 1 }, { a: 2 }];
      const result = arr.orderByThis((item) => item.a);

      expect(result).toBe(arr); // 원본 반환
      expect(arr.map((item) => item.a)).toEqual([1, 2, 3]);
    });
  });

  describe("orderByDescThis()", () => {
    it("원본 배열을 내림차순 정렬한다", () => {
      const arr = [{ a: 1 }, { a: 3 }, { a: 2 }];
      const result = arr.orderByDescThis((item) => item.a);

      expect(result).toBe(arr); // 원본 반환
      expect(arr.map((item) => item.a)).toEqual([3, 2, 1]);
    });

    it("selector 없이 primitive 배열을 내림차순 정렬한다", () => {
      const arr = [1, 3, 2, 5, 4];
      arr.orderByDescThis();

      expect(arr).toEqual([5, 4, 3, 2, 1]);
    });

    it("문자열 배열을 내림차순 정렬한다", () => {
      const arr = ["a", "c", "b"];
      arr.orderByDescThis();

      expect(arr).toEqual(["c", "b", "a"]);
    });
  });

  describe("toggle()", () => {
    it("없는 항목을 추가한다", () => {
      const arr = [1, 2, 3];
      arr.toggle(4);

      expect(arr).toEqual([1, 2, 3, 4]);
    });

    it("있는 항목을 제거한다", () => {
      const arr = [1, 2, 3];
      arr.toggle(2);

      expect(arr).toEqual([1, 3]);
    });
  });

  describe("clear()", () => {
    it("배열의 모든 요소를 제거한다", () => {
      const arr = [1, 2, 3, 4, 5];
      const result = arr.clear();

      expect(result).toBe(arr); // 원본 반환
      expect(arr).toEqual([]);
    });
  });

  //#endregion
});
