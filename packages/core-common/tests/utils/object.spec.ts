import { describe, it, expect } from "vitest";
import { obj as objU, DateTime, DateOnly, Uuid } from "@simplysm/core-common";

describe("object utils", () => {
  //#region clone

  describe("objClone()", () => {
    it("원시 값 복제", () => {
      expect(objU.clone(42)).toBe(42);
      expect(objU.clone("hello")).toBe("hello");
      expect(objU.clone(true)).toBe(true);
      expect(objU.clone(null)).toBe(null);
      expect(objU.clone(undefined)).toBe(undefined);
    });

    it("배열 깊은 복제", () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = objU.clone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it("객체 깊은 복제", () => {
      const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
      const cloned = objU.clone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
      expect(cloned.d).not.toBe(obj.d);
    });

    it("Date 복제", () => {
      const date = new Date(2024, 2, 15);
      const cloned = objU.clone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it("DateTime 복제", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const cloned = objU.clone(dt);

      expect(cloned.tick).toBe(dt.tick);
      expect(cloned).not.toBe(dt);
    });

    it("DateOnly 복제", () => {
      const d = new DateOnly(2024, 3, 15);
      const cloned = objU.clone(d);

      expect(cloned.tick).toBe(d.tick);
      expect(cloned).not.toBe(d);
    });

    it("Uuid 복제", () => {
      const uuid = Uuid.generate();
      const cloned = objU.clone(uuid);

      expect(cloned.toString()).toBe(uuid.toString());
      expect(cloned).not.toBe(uuid);
    });

    it("Map 복제", () => {
      const map = new Map<string, number | { c: number }>([
        ["a", 1],
        ["b", { c: 2 }],
      ]);
      const cloned = objU.clone(map);

      expect(cloned.get("a")).toBe(1);
      expect(cloned.get("b")).toEqual({ c: 2 });
      expect(cloned.get("b")).not.toBe(map.get("b"));
    });

    it("Set 복제", () => {
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

    it("순환 참조 처리", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj["self"] = obj;

      const cloned = objU.clone(obj);

      expect(cloned["a"]).toBe(1);
      expect(cloned["self"]).toBe(cloned);
      expect(cloned).not.toBe(obj);
    });

    it("RegExp 복제", () => {
      const regex = /test/gi;
      const cloned = objU.clone(regex);

      expect(cloned).toEqual(regex);
      expect(cloned).not.toBe(regex);
      expect(cloned.source).toBe("test");
      expect(cloned.flags).toBe("gi");
    });

    it("Error 복제", () => {
      const error = new Error("test error");
      const cloned = objU.clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned).not.toBe(error);
    });

    it("Error cause 복제", () => {
      const cause = new Error("cause error");
      const error = new Error("test error", { cause });
      const cloned = objU.clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned.cause).toBeInstanceOf(Error);
      expect((cloned.cause as Error).message).toBe("cause error");
    });

    it("Error 커스텀 속성 복제", () => {
      const error = new Error("test") as Error & { code: string; detail: object };
      error.code = "ERR_CODE";
      error.detail = { key: "value" };
      const cloned = objU.clone(error);

      expect(cloned.code).toBe("ERR_CODE");
      expect(cloned.detail).toEqual({ key: "value" });
      expect(cloned.detail).not.toBe(error.detail);
    });

    it("Uint8Array 복제", () => {
      const arr = new Uint8Array([1, 2, 3, 4, 5]);
      const cloned = objU.clone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned.buffer).not.toBe(arr.buffer);
    });

    it("Symbol 키는 복제되지 않음", () => {
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
    it("원시 값 비교", () => {
      expect(objU.equal(1, 1)).toBe(true);
      expect(objU.equal(1, 2)).toBe(false);
      expect(objU.equal("a", "a")).toBe(true);
      expect(objU.equal(null, null)).toBe(true);
      expect(objU.equal(undefined, undefined)).toBe(true);
      expect(objU.equal(null, undefined)).toBe(false);
    });

    it("배열 비교", () => {
      expect(objU.equal([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(objU.equal([1, 2, 3], [1, 2])).toBe(false);
      expect(objU.equal([1, 2, 3], [1, 3, 2])).toBe(false);
    });

    it("객체 비교", () => {
      expect(objU.equal({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(objU.equal({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(objU.equal({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("중첩 객체 비교", () => {
      expect(objU.equal({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
      expect(objU.equal({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    });

    it("DateTime 비교", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = new DateTime(2024, 3, 15);
      const dt3 = new DateTime(2024, 3, 16);

      expect(objU.equal(dt1, dt2)).toBe(true);
      expect(objU.equal(dt1, dt3)).toBe(false);
    });

    it("Uuid 비교", () => {
      const uuid1 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid2 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid3 = new Uuid("12345678-9abc-def0-1234-56789abcdef1");

      expect(objU.equal(uuid1, uuid2)).toBe(true);
      expect(objU.equal(uuid1, uuid3)).toBe(false);
    });

    it("RegExp 비교", () => {
      const regex1 = /test/gi;
      const regex2 = /test/gi;
      const regex3 = /test/g;
      const regex4 = /other/gi;

      expect(objU.equal(regex1, regex2)).toBe(true);
      expect(objU.equal(regex1, regex3)).toBe(false); // Different flags
      expect(objU.equal(regex1, regex4)).toBe(false); // Different source
    });

    it("Map 비교", () => {
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

    it("Set 비교", () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);
      const set3 = new Set([1, 2, 4]);

      expect(objU.equal(set1, set2)).toBe(true);
      expect(objU.equal(set1, set3)).toBe(false);
    });

    it("topLevelIncludes 옵션으로 특정 키만 비교", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(objU.equal(obj1, obj2, { topLevelIncludes: ["a"] })).toBe(true);
      expect(objU.equal(obj1, obj2, { topLevelIncludes: ["a", "b"] })).toBe(false);
    });

    it("topLevelExcludes 옵션으로 특정 키 제외", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(objU.equal(obj1, obj2, { topLevelExcludes: ["b", "c"] })).toBe(true);
    });

    it("ignoreArrayIndex 옵션으로 배열 순서 무시", () => {
      expect(objU.equal([1, 2, 3], [3, 2, 1], { ignoreArrayIndex: true })).toBe(true);
    });

    it("shallow 옵션으로 얕은 비교", () => {
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
    it("source가 null일 때 target 복사", () => {
      const target = { a: 1 };
      const result = objU.merge(null, target);

      expect(result).toEqual({ a: 1 });
      expect(result).not.toBe(target);
    });

    it("target이 undefined일 때 source 복사", () => {
      const source = { a: 1 };
      const result = objU.merge(source, undefined);

      expect(result).toEqual({ a: 1 });
    });

    it("객체 병합", () => {
      const source = { a: 1, b: 2 };
      const target = { b: 3, c: 4 };
      const result = objU.merge(source, target);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("중첩 객체 병합", () => {
      const source = { a: { b: 1, c: 2 } };
      const target = { a: { c: 3, d: 4 } };
      const result = objU.merge(source, target);

      expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
    });

    it("arrayProcess: replace로 배열 교체", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [4, 5] };
      const result = objU.merge(source, target, { arrayProcess: "replace" });

      expect(result.arr).toEqual([4, 5]);
    });

    it("arrayProcess: concat로 배열 연결", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [3, 4, 5] };
      const result = objU.merge(source, target, { arrayProcess: "concat" });

      // Duplicates removed via Set
      expect(result.arr).toEqual([1, 2, 3, 4, 5]);
    });

    it("useDelTargetNull 옵션으로 null일 때 삭제", () => {
      const source = { a: 1, b: 2 };
      const target = { b: null };
      const result = objU.merge(source, target, { useDelTargetNull: true });

      expect(result).toEqual({ a: 1 });
    });

    it("source가 객체이고 target이 원시값이면 target 반환", () => {
      const source = { a: 1 };
      const target = "string";

      const result = objU.merge(source, target as any);

      expect(result).toBe("string");
    });

    it("source가 원시값이고 target이 객체이면 target 반환", () => {
      const source = "string";
      const target = { a: 1 };

      const result = objU.merge(source as any, target);

      expect(result).toEqual({ a: 1 });
    });

    it("source가 배열이고 target이 일반 객체이면 target 반환", () => {
      const source = [1, 2, 3];
      const target = { a: 1 };

      const result = objU.merge(source as any, target);

      expect(result).toEqual({ a: 1 });
    });

    it("source가 일반 객체이고 target이 배열이면 target 반환", () => {
      const source = { a: 1 };
      const target = [1, 2, 3];

      const result = objU.merge(source as any, target);

      expect(result).toEqual([1, 2, 3]);
    });

    it("깊게 중첩된 객체 병합 (3+ 레벨)", () => {
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

    it("4레벨 중첩에서 깊은 값만 수정", () => {
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

    it("Map 병합 시 새 키-값 복제", () => {
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
    it("source만 변경 시 source 값 사용", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 2 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it("target만 변경 시 target 값 사용", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 2 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 4 });
    });

    it("둘 다 같은 값으로 변경 시 충돌 없이 해당 값 사용", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 5 };
      const target = { a: 1, b: 5 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 5 });
    });

    it("둘 다 다른 값으로 변경 시 충돌 반환", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      // Origin value preserved
      expect(result.b).toBe(2);
    });

    it("일부 키만 충돌 시 충돌 반환", () => {
      const origin = { a: 1, b: 2, c: 3 };
      const source = { a: 10, b: 20, c: 3 };
      const target = { a: 1, b: 30, c: 4 };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a).toBe(10); // Only source changed
      expect(result.b).toBe(2); // Both changed differently → conflict → origin preserved
      expect(result.c).toBe(4); // Only target changed
    });

    it("중첩 객체에서 충돌 감지", () => {
      const origin = { a: { b: 1, c: 2 } };
      const source = { a: { b: 10, c: 2 } };
      const target = { a: { b: 20, c: 2 } };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a.b).toBe(1); // Both changed differently → conflict → origin preserved
      expect(result.a.c).toBe(2);
    });

    it("다른 내부 키가 변경되는 중첩 객체에서 충돌 감지", () => {
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

    it("배열에서 충돌 감지", () => {
      const origin = { arr: [1, 2, 3] };
      const source = { arr: [1, 2, 4] };
      const target = { arr: [1, 2, 5] };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.arr).toEqual([1, 2, 3]); // Conflict → origin preserved
    });

    it("원시 값에서 충돌 감지", () => {
      const origin = { value: "original" };
      const source = { value: "from source" };
      const target = { value: "from target" };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.value).toBe("original"); // Conflict → origin preserved
    });

    it("optionsObj.keys로 지정한 하위 key만 비교", () => {
      // keys=["x"] → b 비교 시 x만 본다. y는 무시
      const origin = { b: { x: 1, y: 1 } };
      const source = { b: { x: 1, y: 999 } }; // x 동일, y만 다름
      const target = { b: { x: 2, y: 1 } }; // x 변경
      const { conflict, result } = objU.merge3(source, origin, target, {
        b: { keys: ["x"] },
      });

      // equal(source.b, origin.b, keys:["x"]) → x만 비교 → 동일 → target.b 채택
      expect(conflict).toBe(false);
      expect(result.b).toEqual({ x: 2, y: 1 });
    });

    it("optionsObj.excludes로 지정한 하위 key는 비교에서 제외", () => {
      // excludes=["y"] → b 비교 시 y를 제외. x만 본다
      const origin = { b: { x: 1, y: 1 } };
      const source = { b: { x: 1, y: 999 } }; // y만 다름 → excludes로 제외되면 origin과 동일 취급
      const target = { b: { x: 2, y: 1 } }; // x 변경
      const { conflict, result } = objU.merge3(source, origin, target, {
        b: { excludes: ["y"] },
      });

      // equal(source.b, origin.b, excludes:["y"]) → y 무시, x만 비교 → 동일 → target.b 채택
      expect(conflict).toBe(false);
      expect(result.b).toEqual({ x: 2, y: 1 });
    });

    it("optionsObj 없으면 하위 key 전체 비교 (excludes 미적용 대조군)", () => {
      // 위 excludes 케이스와 동일 데이터지만 옵션 없음 → y 차이로 충돌
      const origin = { b: { x: 1, y: 1 } };
      const source = { b: { x: 1, y: 999 } };
      const target = { b: { x: 2, y: 1 } };
      const { conflict, result } = objU.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.b).toEqual({ x: 1, y: 1 }); // 충돌 → origin 유지
    });
  });

  //#endregion

  //#region omit / pick

  describe("objU.omit()", () => {
    it("특정 키 제외", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.omit(obj, ["b"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("복수 키 제외", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = objU.omit(obj, ["a", "c"]);

      expect(result).toEqual({ b: 2, d: 4 });
    });
  });

  describe("objU.omitByFilter()", () => {
    it("조건에 맞는 키 제외", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.omitByFilter(obj, (key) => key === "b");

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe("objU.pick()", () => {
    it("특정 키만 선택", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.pick(obj, ["a", "c"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  //#endregion

  //#region chain value

  describe("objU.getChainValue()", () => {
    it("점 표기법으로 값 가져오기", () => {
      const obj = { a: { b: { c: 1 } } };

      expect(objU.getChainValue(obj, "a.b.c")).toBe(1);
    });

    it("배열 표기법으로 값 가져오기", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };

      expect(objU.getChainValue(obj, "arr[1].name")).toBe("second");
    });

    it("optional: true로 존재하지 않는 경로에 undefined 반환", () => {
      const obj = { a: 1 };

      expect(objU.getChainValue(obj, "b.c.d", true)).toBe(undefined);
    });
  });

  describe("objU.getChainValueByDepth()", () => {
    it("같은 키로 깊이만큼 탐색", () => {
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

    it("depth가 0일 때 오류 발생", () => {
      const obj = { parent: { name: "child" } };

      expect(() => objU.getChainValueByDepth(obj, "parent", 0)).toThrow(
        "1 이상",
      );
    });

    it("depth가 1일 때 한 단계 탐색", () => {
      const obj = { parent: { name: "child" } };

      const result = objU.getChainValueByDepth(obj, "parent", 1);

      expect(result).toEqual({ name: "child" });
    });

    it("optional: true로 중간 경로 없을 때 undefined 반환", () => {
      const obj = { parent: { name: "child" } };

      const result = objU.getChainValueByDepth(obj, "parent", 5, true);

      expect(result).toBe(undefined);
    });

    it("optional 없이 중간 경로 없을 때 오류 발생", () => {
      const obj = { parent: undefined as unknown };

      // Without optional, trying to access property on undefined throws error
      // Current implementation only checks result == null inside optional condition
      // So without optional, error is possible
      expect(() => objU.getChainValueByDepth(obj as any, "parent", 2)).toThrow();
    });
  });

  describe("objU.setChainValue()", () => {
    it("점 표기법으로 값 설정", () => {
      const obj: Record<string, unknown> = {};
      objU.setChainValue(obj, "a.b.c", 1);

      expect(obj).toEqual({ a: { b: { c: 1 } } });
    });

    it("기존 값 덮어쓰기", () => {
      const obj = { a: { b: { c: 1 } } };
      objU.setChainValue(obj, "a.b.c", 2);

      expect(obj.a.b.c).toBe(2);
    });

    it("빈 체인에 대해 오류 발생", () => {
      const obj: Record<string, unknown> = {};

      expect(() => objU.setChainValue(obj, "", 1)).toThrow();
    });
  });

  describe("objU.deleteChainValue()", () => {
    it("체인 경로의 값 삭제", () => {
      const obj = { a: { b: { c: 1, d: 2 } } };
      objU.deleteChainValue(obj, "a.b.c");

      expect(obj.a.b).toEqual({ d: 2 });
    });

    it("존재하지 않는 경로 무시", () => {
      const obj = { a: 1 };

      // No error when intermediate path missing
      expect(() => objU.deleteChainValue(obj, "b.c.d")).not.toThrow();
      expect(obj).toEqual({ a: 1 });
    });

    it("undefined 중간 경로 무시", () => {
      const obj: Record<string, unknown> = { a: undefined };

      expect(() => objU.deleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: undefined });
    });

    it("null 중간 경로 무시", () => {
      const obj: Record<string, unknown> = { a: null };

      expect(() => objU.deleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: null });
    });

    it("배열 인덱스 경로로 삭제", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };
      objU.deleteChainValue(obj, "arr[0].name");

      expect(obj.arr[0]).toEqual({});
      expect(obj.arr[1]).toEqual({ name: "second" });
    });

    it("빈 체인에 대해 오류 발생", () => {
      const obj = { a: 1 };

      expect(() => objU.deleteChainValue(obj, "")).toThrow();
    });
  });

  //#endregion

  //#region clear / transform

  describe("objU.clearUndefined()", () => {
    it("undefined 값의 키 삭제", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = objU.clearUndefined(obj);

      expect(result).toEqual({ a: 1, c: 3 });
      expect("b" in result).toBe(false);
    });
  });

  describe("objU.clear()", () => {
    it("모든 키 삭제", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objU.clear(obj);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("objU.nullToUndefined()", () => {
    it("null을 undefined로 변환", () => {
      expect(objU.nullToUndefined(null)).toBe(undefined);
    });

    it("중첩된 null을 undefined로 변환", () => {
      const obj = { a: 1, b: null, c: { d: null } };
      const result = objU.nullToUndefined(obj);

      expect(result).toEqual({ a: 1, b: undefined, c: { d: undefined } });
    });

    it("배열의 null을 undefined로 변환", () => {
      const arr = [1, null, { a: null }];
      const result = objU.nullToUndefined(arr);

      expect(result).toEqual([1, undefined, { a: undefined }]);
    });

    it("순환 참조가 있는 객체를 안전하게 처리", () => {
      const obj: Record<string, unknown> = { a: null };
      obj["self"] = obj;
      const result = objU.nullToUndefined(obj);
      expect(result).toBeDefined();
      expect((result as Record<string, unknown>)["a"]).toBeUndefined();
    });

    it("순환 참조가 있는 배열을 안전하게 처리", () => {
      const arr: unknown[] = [null, 1];
      arr.push(arr);
      const result = objU.nullToUndefined(arr);
      expect(result).toBeDefined();
      expect((result as unknown[])[0]).toBeUndefined();
      expect((result as unknown[])[1]).toBe(1);
    });
  });

  describe("objU.unflatten()", () => {
    it("평탄화된 객체를 중첩 구조로 변환", () => {
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
