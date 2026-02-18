import { describe, it, expect } from "vitest";
import {
  objClone as clone,
  objEqual,
  objMerge,
  objMerge3,
  objOmit,
  objOmitByFilter,
  objPick,
  objGetChainValue,
  objGetChainValueByDepth,
  objSetChainValue,
  objDeleteChainValue,
  objClearUndefined,
  objClear,
  objNullToUndefined,
  objUnflatten,
  DateTime,
  DateOnly,
  Uuid,
} from "@simplysm/core-common";

describe("object utils", () => {
  //#region clone

  describe("objClone()", () => {
    it("primitive 값을 복사한다", () => {
      expect(clone(42)).toBe(42);
      expect(clone("hello")).toBe("hello");
      expect(clone(true)).toBe(true);
      expect(clone(null)).toBe(null);
      expect(clone(undefined)).toBe(undefined);
    });

    it("배열을 깊은 복사한다", () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = clone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it("객체를 깊은 복사한다", () => {
      const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
      const cloned = clone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
      expect(cloned.d).not.toBe(obj.d);
    });

    it("Date를 복사한다", () => {
      const date = new Date(2024, 2, 15);
      const cloned = clone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it("DateTime을 복사한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const cloned = clone(dt);

      expect(cloned.tick).toBe(dt.tick);
      expect(cloned).not.toBe(dt);
    });

    it("DateOnly를 복사한다", () => {
      const d = new DateOnly(2024, 3, 15);
      const cloned = clone(d);

      expect(cloned.tick).toBe(d.tick);
      expect(cloned).not.toBe(d);
    });

    it("Uuid를 복사한다", () => {
      const uuid = Uuid.new();
      const cloned = clone(uuid);

      expect(cloned.toString()).toBe(uuid.toString());
      expect(cloned).not.toBe(uuid);
    });

    it("Map을 복사한다", () => {
      const map = new Map<string, number | { c: number }>([
        ["a", 1],
        ["b", { c: 2 }],
      ]);
      const cloned = clone(map);

      expect(cloned.get("a")).toBe(1);
      expect(cloned.get("b")).toEqual({ c: 2 });
      expect(cloned.get("b")).not.toBe(map.get("b"));
    });

    it("Set을 복사한다", () => {
      const obj = { a: 1 };
      const set = new Set([1, 2, obj]);
      const cloned = clone(set);

      expect(cloned.has(1)).toBe(true);
      expect(cloned.has(2)).toBe(true);
      // Set에 있는 obj는 복사됨
      const clonedObj = Array.from(cloned).find((item) => typeof item === "object");
      expect(clonedObj).toEqual(obj);
      expect(clonedObj).not.toBe(obj);
    });

    it("순환 참조를 처리한다", () => {
      const obj: Record<string, unknown> = { a: 1 };
      obj["self"] = obj;

      const cloned = clone(obj);

      expect(cloned["a"]).toBe(1);
      expect(cloned["self"]).toBe(cloned);
      expect(cloned).not.toBe(obj);
    });

    it("RegExp를 복사한다", () => {
      const regex = /test/gi;
      const cloned = clone(regex);

      expect(cloned).toEqual(regex);
      expect(cloned).not.toBe(regex);
      expect(cloned.source).toBe("test");
      expect(cloned.flags).toBe("gi");
    });

    it("Error를 복사한다", () => {
      const error = new Error("test error");
      const cloned = clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned).not.toBe(error);
    });

    it("Error의 cause를 복사한다", () => {
      const cause = new Error("cause error");
      const error = new Error("test error", { cause });
      const cloned = clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned.cause).toBeInstanceOf(Error);
      expect((cloned.cause as Error).message).toBe("cause error");
    });

    it("Error의 커스텀 속성을 복사한다", () => {
      const error = new Error("test") as Error & { code: string; detail: object };
      error.code = "ERR_CODE";
      error.detail = { key: "value" };
      const cloned = clone(error);

      expect(cloned.code).toBe("ERR_CODE");
      expect(cloned.detail).toEqual({ key: "value" });
      expect(cloned.detail).not.toBe(error.detail);
    });

    it("Uint8Array를 복사한다", () => {
      const arr = new Uint8Array([1, 2, 3, 4, 5]);
      const cloned = clone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned.buffer).not.toBe(arr.buffer);
    });

    it("Symbol 키는 복사되지 않는다", () => {
      // Object.keys()는 Symbol 키를 열거하지 않으므로 복사되지 않음
      const sym = Symbol("test");
      const obj = { a: 1, [sym]: "symbol value" };
      const cloned = clone(obj);

      expect(cloned.a).toBe(1);
      expect(cloned[sym]).toBeUndefined();
    });
  });

  //#endregion

  //#region equal

  describe("objEqual()", () => {
    it("primitive 값을 비교한다", () => {
      expect(objEqual(1, 1)).toBe(true);
      expect(objEqual(1, 2)).toBe(false);
      expect(objEqual("a", "a")).toBe(true);
      expect(objEqual(null, null)).toBe(true);
      expect(objEqual(undefined, undefined)).toBe(true);
      expect(objEqual(null, undefined)).toBe(false);
    });

    it("배열을 비교한다", () => {
      expect(objEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(objEqual([1, 2, 3], [1, 2])).toBe(false);
      expect(objEqual([1, 2, 3], [1, 3, 2])).toBe(false);
    });

    it("객체를 비교한다", () => {
      expect(objEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(objEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(objEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("중첩된 객체를 비교한다", () => {
      expect(objEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
      expect(objEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    });

    it("DateTime을 비교한다", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = new DateTime(2024, 3, 15);
      const dt3 = new DateTime(2024, 3, 16);

      expect(objEqual(dt1, dt2)).toBe(true);
      expect(objEqual(dt1, dt3)).toBe(false);
    });

    it("Uuid를 비교한다", () => {
      const uuid1 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid2 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid3 = new Uuid("12345678-9abc-def0-1234-56789abcdef1");

      expect(objEqual(uuid1, uuid2)).toBe(true);
      expect(objEqual(uuid1, uuid3)).toBe(false);
    });

    it("RegExp를 비교한다", () => {
      const regex1 = /test/gi;
      const regex2 = /test/gi;
      const regex3 = /test/g;
      const regex4 = /other/gi;

      expect(objEqual(regex1, regex2)).toBe(true);
      expect(objEqual(regex1, regex3)).toBe(false); // flags 다름
      expect(objEqual(regex1, regex4)).toBe(false); // source 다름
    });

    it("Map을 비교한다", () => {
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

      expect(objEqual(map1, map2)).toBe(true);
      expect(objEqual(map1, map3)).toBe(false);
    });

    it("Set을 비교한다", () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);
      const set3 = new Set([1, 2, 4]);

      expect(objEqual(set1, set2)).toBe(true);
      expect(objEqual(set1, set3)).toBe(false);
    });

    it("topLevelIncludes 옵션으로 특정 키만 비교한다", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(objEqual(obj1, obj2, { topLevelIncludes: ["a"] })).toBe(true);
      expect(objEqual(obj1, obj2, { topLevelIncludes: ["a", "b"] })).toBe(false);
    });

    it("topLevelExcludes 옵션으로 특정 키를 제외한다", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(objEqual(obj1, obj2, { topLevelExcludes: ["b", "c"] })).toBe(true);
    });

    it("ignoreArrayIndex 옵션으로 배열 순서를 무시한다", () => {
      expect(objEqual([1, 2, 3], [3, 2, 1], { ignoreArrayIndex: true })).toBe(true);
    });

    it("onlyOneDepth 옵션으로 얕은 비교를 한다", () => {
      const inner = { c: 1 };
      const obj1 = { a: 1, b: inner };
      const obj2 = { a: 1, b: inner };
      const obj3 = { a: 1, b: { c: 1 } };

      expect(objEqual(obj1, obj2, { onlyOneDepth: true })).toBe(true);
      expect(objEqual(obj1, obj3, { onlyOneDepth: true })).toBe(false);
    });
  });

  //#endregion

  //#region merge

  describe("objMerge()", () => {
    it("source가 null이면 target을 복사한다", () => {
      const target = { a: 1 };
      const result = objMerge(null, target);

      expect(result).toEqual({ a: 1 });
      expect(result).not.toBe(target);
    });

    it("target이 undefined면 source를 복사한다", () => {
      const source = { a: 1 };
      const result = objMerge(source, undefined);

      expect(result).toEqual({ a: 1 });
    });

    it("객체를 병합한다", () => {
      const source = { a: 1, b: 2 };
      const target = { b: 3, c: 4 };
      const result = objMerge(source, target);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("중첩된 객체를 병합한다", () => {
      const source = { a: { b: 1, c: 2 } };
      const target = { a: { c: 3, d: 4 } };
      const result = objMerge(source, target);

      expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
    });

    it("arrayProcess: replace로 배열을 대체한다", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [4, 5] };
      const result = objMerge(source, target, { arrayProcess: "replace" });

      expect(result.arr).toEqual([4, 5]);
    });

    it("arrayProcess: concat으로 배열을 합친다", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [3, 4, 5] };
      const result = objMerge(source, target, { arrayProcess: "concat" });

      // Set으로 중복 제거됨
      expect(result.arr).toEqual([1, 2, 3, 4, 5]);
    });

    it("useDelTargetNull로 null이면 삭제한다", () => {
      const source = { a: 1, b: 2 };
      const target = { b: null };
      const result = objMerge(source, target, { useDelTargetNull: true });

      expect(result).toEqual({ a: 1 });
    });

    it("source가 object이고 target이 primitive면 target을 반환한다", () => {
      const source = { a: 1 };
      const target = "string";

      const result = objMerge(source, target as any);

      expect(result).toBe("string");
    });

    it("source가 primitive이고 target이 object면 target을 반환한다", () => {
      const source = "string";
      const target = { a: 1 };

      const result = objMerge(source as any, target);

      expect(result).toEqual({ a: 1 });
    });

    it("source가 배열이고 target이 일반 객체면 target을 반환한다", () => {
      const source = [1, 2, 3];
      const target = { a: 1 };

      const result = objMerge(source as any, target);

      expect(result).toEqual({ a: 1 });
    });

    it("source가 일반 객체이고 target이 배열이면 target을 반환한다", () => {
      const source = { a: 1 };
      const target = [1, 2, 3];

      const result = objMerge(source as any, target);

      expect(result).toEqual([1, 2, 3]);
    });

    it("3단계 이상 중첩된 객체를 병합한다", () => {
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

      const result = objMerge(source, target);

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

    it("4단계 중첩에서 깊은 값만 변경한다", () => {
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

      const result = objMerge(source, target);

      expect(result.a.b.c.d.value).toBe(2);
    });

    it("Map 병합 시 target의 새 키-값이 clone된다", () => {
      const sourceMap = new Map<string, { value: number }>([["key1", { value: 1 }]]);
      const targetObj = { value: 2 };
      const targetMap = new Map<string, { value: number }>([["key2", targetObj]]);

      const result = objMerge(sourceMap, targetMap);

      // key2의 값이 clone되어 원본과 다른 참조여야 함
      expect(result.get("key2")).toEqual({ value: 2 });
      expect(result.get("key2")).not.toBe(targetObj);
    });
  });

  describe("objMerge3()", () => {
    it("source만 변경된 경우 source 값을 사용한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 2 };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it("target만 변경된 경우 target 값을 사용한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 2 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 4 });
    });

    it("source와 target이 같은 값으로 변경된 경우 충돌 없이 해당 값을 사용한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 5 };
      const target = { a: 1, b: 5 };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 5 });
    });

    it("source와 target이 다른 값으로 변경된 경우 충돌을 반환한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(true);
      // origin 값 유지
      expect(result.b).toBe(2);
    });

    it("여러 키에서 일부만 충돌하면 충돌을 반환한다", () => {
      const origin = { a: 1, b: 2, c: 3 };
      const source = { a: 10, b: 20, c: 3 };
      const target = { a: 1, b: 30, c: 4 };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a).toBe(10); // source만 변경
      expect(result.b).toBe(2); // 둘 다 다르게 변경 → 충돌 → origin 유지
      expect(result.c).toBe(4); // target만 변경
    });

    it("중첩된 객체에서 충돌을 감지한다", () => {
      const origin = { a: { b: 1, c: 2 } };
      const source = { a: { b: 10, c: 2 } };
      const target = { a: { b: 20, c: 2 } };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a.b).toBe(1); // 둘 다 다르게 변경 → 충돌 → origin 유지
      expect(result.a.c).toBe(2);
    });

    it("중첩된 객체에서 각각 다른 내부 키가 변경되어도 객체 단위로 비교하므로 충돌로 감지된다", () => {
      // merge3는 키 단위로 비교하므로, { a: {...} } 전체를 비교함
      // source.a와 origin.a가 다르고, target.a와 origin.a도 다르면 충돌
      const origin = { a: { b: 1, c: 2 } };
      const source = { a: { b: 10, c: 2 } };
      const target = { a: { b: 1, c: 20 } };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a.b).toBe(1); // 충돌 시 origin 유지
      expect(result.a.c).toBe(2);
    });

    it("배열에서 충돌을 감지한다", () => {
      const origin = { arr: [1, 2, 3] };
      const source = { arr: [1, 2, 4] };
      const target = { arr: [1, 2, 5] };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.arr).toEqual([1, 2, 3]); // 충돌 시 origin 유지
    });

    it("primitive 값에서 충돌을 감지한다", () => {
      const origin = { value: "original" };
      const source = { value: "from source" };
      const target = { value: "from target" };
      const { conflict, result } = objMerge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.value).toBe("original"); // 충돌 시 origin 유지
    });
  });

  //#endregion

  //#region omit / pick

  describe("objOmit()", () => {
    it("특정 키들을 제외한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objOmit(obj, ["b"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("여러 키를 제외한다", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = objOmit(obj, ["a", "c"]);

      expect(result).toEqual({ b: 2, d: 4 });
    });
  });

  describe("objOmitByFilter()", () => {
    it("조건에 맞는 키를 제외한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objOmitByFilter(obj, (key) => key === "b");

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe("objPick()", () => {
    it("특정 키들만 선택한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objPick(obj, ["a", "c"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  //#endregion

  //#region chain value

  describe("objGetChainValue()", () => {
    it("점 표기법으로 값을 가져온다", () => {
      const obj = { a: { b: { c: 1 } } };

      expect(objGetChainValue(obj, "a.b.c")).toBe(1);
    });

    it("배열 표기법으로 값을 가져온다", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };

      expect(objGetChainValue(obj, "arr[1].name")).toBe("second");
    });

    it("optional: true로 없는 경로는 undefined를 반환한다", () => {
      const obj = { a: 1 };

      expect(objGetChainValue(obj, "b.c.d", true)).toBe(undefined);
    });
  });

  describe("objGetChainValueByDepth()", () => {
    it("depth만큼 같은 키로 내려간다", () => {
      const obj = {
        parent: {
          parent: {
            parent: {
              name: "leaf",
            },
          },
        },
      };

      const result = objGetChainValueByDepth(obj, "parent", 2);

      expect(result).toEqual({ parent: { name: "leaf" } });
    });

    it("depth가 0이면 에러를 던진다", () => {
      const obj = { parent: { name: "child" } };

      expect(() => objGetChainValueByDepth(obj, "parent", 0)).toThrow(
        "depth는 1 이상이어야 합니다.",
      );
    });

    it("depth가 1이면 한 단계만 내려간다", () => {
      const obj = { parent: { name: "child" } };

      const result = objGetChainValueByDepth(obj, "parent", 1);

      expect(result).toEqual({ name: "child" });
    });

    it("optional: true로 중간 경로가 없으면 undefined를 반환한다", () => {
      const obj = { parent: { name: "child" } };

      const result = objGetChainValueByDepth(obj, "parent", 5, true);

      expect(result).toBe(undefined);
    });

    it("optional 없이 중간 경로가 없으면 에러 발생 가능", () => {
      const obj = { parent: undefined as unknown };

      // optional이 없으면 undefined에서 키를 접근하려 해서 에러 발생 가능
      // 하지만 현재 구현에서는 result == null 체크가 optional 조건 내에서만 동작
      // 따라서 optional 없이 사용 시 주의 필요
      expect(() => objGetChainValueByDepth(obj as any, "parent", 2)).toThrow();
    });
  });

  describe("objSetChainValue()", () => {
    it("점 표기법으로 값을 설정한다", () => {
      const obj: Record<string, unknown> = {};
      objSetChainValue(obj, "a.b.c", 1);

      expect(obj).toEqual({ a: { b: { c: 1 } } });
    });

    it("기존 값을 덮어쓴다", () => {
      const obj = { a: { b: { c: 1 } } };
      objSetChainValue(obj, "a.b.c", 2);

      expect(obj.a.b.c).toBe(2);
    });

    it("빈 체인은 에러를 던진다", () => {
      const obj: Record<string, unknown> = {};

      expect(() => objSetChainValue(obj, "", 1)).toThrow();
    });
  });

  describe("objDeleteChainValue()", () => {
    it("체인 경로의 값을 삭제한다", () => {
      const obj = { a: { b: { c: 1, d: 2 } } };
      objDeleteChainValue(obj, "a.b.c");

      expect(obj.a.b).toEqual({ d: 2 });
    });

    it("존재하지 않는 경로는 에러 없이 무시한다", () => {
      const obj = { a: 1 };

      // 중간 경로가 없어도 에러 없음
      expect(() => objDeleteChainValue(obj, "b.c.d")).not.toThrow();
      expect(obj).toEqual({ a: 1 });
    });

    it("중간 경로가 undefined여도 에러 없이 무시한다", () => {
      const obj: Record<string, unknown> = { a: undefined };

      expect(() => objDeleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: undefined });
    });

    it("중간 경로가 null이어도 에러 없이 무시한다", () => {
      const obj: Record<string, unknown> = { a: null };

      expect(() => objDeleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: null });
    });

    it("배열 인덱스 경로도 삭제한다", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };
      objDeleteChainValue(obj, "arr[0].name");

      expect(obj.arr[0]).toEqual({});
      expect(obj.arr[1]).toEqual({ name: "second" });
    });

    it("빈 체인은 에러를 던진다", () => {
      const obj = { a: 1 };

      expect(() => objDeleteChainValue(obj, "")).toThrow();
    });
  });

  //#endregion

  //#region clear / transform

  describe("objClearUndefined()", () => {
    it("undefined 값을 가진 키를 삭제한다", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = objClearUndefined(obj);

      expect(result).toEqual({ a: 1, c: 3 });
      expect("b" in result).toBe(false);
    });
  });

  describe("objClear()", () => {
    it("모든 키를 삭제한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = objClear(obj);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("objNullToUndefined()", () => {
    it("null을 undefined로 변환한다", () => {
      expect(objNullToUndefined(null)).toBe(undefined);
    });

    it("중첩된 null도 변환한다", () => {
      const obj = { a: 1, b: null, c: { d: null } };
      const result = objNullToUndefined(obj);

      expect(result).toEqual({ a: 1, b: undefined, c: { d: undefined } });
    });

    it("배열의 null도 변환한다", () => {
      const arr = [1, null, { a: null }];
      const result = objNullToUndefined(arr);

      expect(result).toEqual([1, undefined, { a: undefined }]);
    });

    it("순환 참조가 있는 객체를 안전하게 처리한다", () => {
      const obj: Record<string, unknown> = { a: null };
      obj.self = obj;
      const result = objNullToUndefined(obj);
      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).a).toBeUndefined();
    });

    it("순환 참조가 있는 배열을 안전하게 처리한다", () => {
      const arr: unknown[] = [null, 1];
      arr.push(arr);
      const result = objNullToUndefined(arr);
      expect(result).toBeDefined();
      expect((result as unknown[])[0]).toBeUndefined();
      expect((result as unknown[])[1]).toBe(1);
    });
  });

  describe("objUnflatten()", () => {
    it("flat된 객체를 nested로 변환한다", () => {
      const flat = { "a.b.c": 1, "a.b.d": 2, "e": 3 };
      const result = objUnflatten(flat);

      expect(result).toEqual({
        a: { b: { c: 1, d: 2 } },
        e: 3,
      });
    });
  });

  //#endregion
});
