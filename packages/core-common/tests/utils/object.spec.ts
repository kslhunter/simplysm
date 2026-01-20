import { describe, it, expect } from "vitest";
import { ObjectUtils, DateTime, DateOnly, Uuid } from "@simplysm/core-common";

describe("ObjectUtils", () => {
  //#region clone

  describe("clone()", () => {
    it("primitive 값을 복사한다", () => {
      expect(ObjectUtils.clone(42)).toBe(42);
      expect(ObjectUtils.clone("hello")).toBe("hello");
      expect(ObjectUtils.clone(true)).toBe(true);
      expect(ObjectUtils.clone(null)).toBe(null);
      expect(ObjectUtils.clone(undefined)).toBe(undefined);
    });

    it("배열을 깊은 복사한다", () => {
      const arr = [1, [2, 3], { a: 4 }];
      const cloned = ObjectUtils.clone(arr);

      expect(cloned).toEqual(arr);
      expect(cloned).not.toBe(arr);
      expect(cloned[1]).not.toBe(arr[1]);
      expect(cloned[2]).not.toBe(arr[2]);
    });

    it("객체를 깊은 복사한다", () => {
      const obj = { a: 1, b: { c: 2 }, d: [3, 4] };
      const cloned = ObjectUtils.clone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
      expect(cloned.d).not.toBe(obj.d);
    });

    it("Date를 복사한다", () => {
      const date = new Date(2024, 2, 15);
      const cloned = ObjectUtils.clone(date);

      expect(cloned).toEqual(date);
      expect(cloned).not.toBe(date);
    });

    it("DateTime을 복사한다", () => {
      const dt = new DateTime(2024, 3, 15, 10, 30);
      const cloned = ObjectUtils.clone(dt);

      expect(cloned.tick).toBe(dt.tick);
      expect(cloned).not.toBe(dt);
    });

    it("DateOnly를 복사한다", () => {
      const d = new DateOnly(2024, 3, 15);
      const cloned = ObjectUtils.clone(d);

      expect(cloned.tick).toBe(d.tick);
      expect(cloned).not.toBe(d);
    });

    it("Uuid를 복사한다", () => {
      const uuid = Uuid.new();
      const cloned = ObjectUtils.clone(uuid);

      expect(cloned.toString()).toBe(uuid.toString());
      expect(cloned).not.toBe(uuid);
    });

    it("Map을 복사한다", () => {
      const map = new Map<string, number | { c: number }>([
        ["a", 1],
        ["b", { c: 2 }],
      ]);
      const cloned = ObjectUtils.clone(map);

      expect(cloned.get("a")).toBe(1);
      expect(cloned.get("b")).toEqual({ c: 2 });
      expect(cloned.get("b")).not.toBe(map.get("b"));
    });

    it("Set을 복사한다", () => {
      const obj = { a: 1 };
      const set = new Set([1, 2, obj]);
      const cloned = ObjectUtils.clone(set);

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

      const cloned = ObjectUtils.clone(obj);

      expect(cloned["a"]).toBe(1);
      expect(cloned["self"]).toBe(cloned);
      expect(cloned).not.toBe(obj);
    });

    it("RegExp를 복사한다", () => {
      const regex = /test/gi;
      const cloned = ObjectUtils.clone(regex);

      expect(cloned).toEqual(regex);
      expect(cloned).not.toBe(regex);
      expect(cloned.source).toBe("test");
      expect(cloned.flags).toBe("gi");
    });

    it("Error를 복사한다", () => {
      const error = new Error("test error");
      const cloned = ObjectUtils.clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned).not.toBe(error);
    });

    it("Error의 cause를 복사한다", () => {
      const cause = new Error("cause error");
      const error = new Error("test error", { cause });
      const cloned = ObjectUtils.clone(error);

      expect(cloned.message).toBe("test error");
      expect(cloned.cause).toBeInstanceOf(Error);
      expect((cloned.cause as Error).message).toBe("cause error");
    });
  });

  //#endregion

  //#region equal

  describe("equal()", () => {
    it("primitive 값을 비교한다", () => {
      expect(ObjectUtils.equal(1, 1)).toBe(true);
      expect(ObjectUtils.equal(1, 2)).toBe(false);
      expect(ObjectUtils.equal("a", "a")).toBe(true);
      expect(ObjectUtils.equal(null, null)).toBe(true);
      expect(ObjectUtils.equal(undefined, undefined)).toBe(true);
      expect(ObjectUtils.equal(null, undefined)).toBe(false);
    });

    it("배열을 비교한다", () => {
      expect(ObjectUtils.equal([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(ObjectUtils.equal([1, 2, 3], [1, 2])).toBe(false);
      expect(ObjectUtils.equal([1, 2, 3], [1, 3, 2])).toBe(false);
    });

    it("객체를 비교한다", () => {
      expect(ObjectUtils.equal({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(ObjectUtils.equal({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(ObjectUtils.equal({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("중첩된 객체를 비교한다", () => {
      expect(ObjectUtils.equal({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true);
      expect(ObjectUtils.equal({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(false);
    });

    it("DateTime을 비교한다", () => {
      const dt1 = new DateTime(2024, 3, 15);
      const dt2 = new DateTime(2024, 3, 15);
      const dt3 = new DateTime(2024, 3, 16);

      expect(ObjectUtils.equal(dt1, dt2)).toBe(true);
      expect(ObjectUtils.equal(dt1, dt3)).toBe(false);
    });

    it("Uuid를 비교한다", () => {
      const uuid1 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid2 = new Uuid("12345678-9abc-def0-1234-56789abcdef0");
      const uuid3 = new Uuid("12345678-9abc-def0-1234-56789abcdef1");

      expect(ObjectUtils.equal(uuid1, uuid2)).toBe(true);
      expect(ObjectUtils.equal(uuid1, uuid3)).toBe(false);
    });

    it("RegExp를 비교한다", () => {
      const regex1 = /test/gi;
      const regex2 = /test/gi;
      const regex3 = /test/g;
      const regex4 = /other/gi;

      expect(ObjectUtils.equal(regex1, regex2)).toBe(true);
      expect(ObjectUtils.equal(regex1, regex3)).toBe(false); // flags 다름
      expect(ObjectUtils.equal(regex1, regex4)).toBe(false); // source 다름
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

      expect(ObjectUtils.equal(map1, map2)).toBe(true);
      expect(ObjectUtils.equal(map1, map3)).toBe(false);
    });

    it("Set을 비교한다", () => {
      const set1 = new Set([1, 2, 3]);
      const set2 = new Set([1, 2, 3]);
      const set3 = new Set([1, 2, 4]);

      expect(ObjectUtils.equal(set1, set2)).toBe(true);
      expect(ObjectUtils.equal(set1, set3)).toBe(false);
    });

    it("includes 옵션으로 특정 키만 비교한다", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(ObjectUtils.equal(obj1, obj2, { includes: ["a"] })).toBe(true);
      expect(ObjectUtils.equal(obj1, obj2, { includes: ["a", "b"] })).toBe(false);
    });

    it("excludes 옵션으로 특정 키를 제외한다", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 99, c: 99 };

      expect(ObjectUtils.equal(obj1, obj2, { excludes: ["b", "c"] })).toBe(true);
    });

    it("ignoreArrayIndex 옵션으로 배열 순서를 무시한다", () => {
      expect(ObjectUtils.equal([1, 2, 3], [3, 2, 1], { ignoreArrayIndex: true })).toBe(true);
    });

    it("onlyOneDepth 옵션으로 얕은 비교를 한다", () => {
      const inner = { c: 1 };
      const obj1 = { a: 1, b: inner };
      const obj2 = { a: 1, b: inner };
      const obj3 = { a: 1, b: { c: 1 } };

      expect(ObjectUtils.equal(obj1, obj2, { onlyOneDepth: true })).toBe(true);
      expect(ObjectUtils.equal(obj1, obj3, { onlyOneDepth: true })).toBe(false);
    });
  });

  //#endregion

  //#region merge

  describe("merge()", () => {
    it("source가 null이면 target을 복사한다", () => {
      const target = { a: 1 };
      const result = ObjectUtils.merge(null, target);

      expect(result).toEqual({ a: 1 });
      expect(result).not.toBe(target);
    });

    it("target이 undefined면 source를 복사한다", () => {
      const source = { a: 1 };
      const result = ObjectUtils.merge(source, undefined);

      expect(result).toEqual({ a: 1 });
    });

    it("객체를 병합한다", () => {
      const source = { a: 1, b: 2 };
      const target = { b: 3, c: 4 };
      const result = ObjectUtils.merge(source, target);

      expect(result).toEqual({ a: 1, b: 3, c: 4 });
    });

    it("중첩된 객체를 병합한다", () => {
      const source = { a: { b: 1, c: 2 } };
      const target = { a: { c: 3, d: 4 } };
      const result = ObjectUtils.merge(source, target);

      expect(result).toEqual({ a: { b: 1, c: 3, d: 4 } });
    });

    it("arrayProcess: replace로 배열을 대체한다", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [4, 5] };
      const result = ObjectUtils.merge(source, target, { arrayProcess: "replace" });

      expect(result.arr).toEqual([4, 5]);
    });

    it("arrayProcess: concat으로 배열을 합친다", () => {
      const source = { arr: [1, 2, 3] };
      const target = { arr: [3, 4, 5] };
      const result = ObjectUtils.merge(source, target, { arrayProcess: "concat" });

      // Set으로 중복 제거됨
      expect(result.arr).toEqual([1, 2, 3, 4, 5]);
    });

    it("useDelTargetNull로 null이면 삭제한다", () => {
      const source = { a: 1, b: 2 };
      const target = { b: null };
      const result = ObjectUtils.merge(source, target, { useDelTargetNull: true });

      expect(result).toEqual({ a: 1 });
    });

    it("서로 다른 타입을 병합하면 에러를 던진다", () => {
      const source = { a: 1 };
      const target = [1, 2, 3];

      expect(() => ObjectUtils.merge(source, target as any)).toThrow();
    });
  });

  describe("merge3()", () => {
    it("source만 변경된 경우 source 값을 사용한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 2 };
      const { conflict, result } = ObjectUtils.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 3 });
    });

    it("target만 변경된 경우 target 값을 사용한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 2 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = ObjectUtils.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 4 });
    });

    it("source와 target이 같은 값으로 변경된 경우 충돌 없이 해당 값을 사용한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 5 };
      const target = { a: 1, b: 5 };
      const { conflict, result } = ObjectUtils.merge3(source, origin, target);

      expect(conflict).toBe(false);
      expect(result).toEqual({ a: 1, b: 5 });
    });

    it("source와 target이 다른 값으로 변경된 경우 충돌을 반환한다", () => {
      const origin = { a: 1, b: 2 };
      const source = { a: 1, b: 3 };
      const target = { a: 1, b: 4 };
      const { conflict, result } = ObjectUtils.merge3(source, origin, target);

      expect(conflict).toBe(true);
      // origin 값 유지
      expect(result.b).toBe(2);
    });

    it("여러 키에서 일부만 충돌하면 충돌을 반환한다", () => {
      const origin = { a: 1, b: 2, c: 3 };
      const source = { a: 10, b: 20, c: 3 };
      const target = { a: 1, b: 30, c: 4 };
      const { conflict, result } = ObjectUtils.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a).toBe(10); // source만 변경
      expect(result.b).toBe(2); // 둘 다 다르게 변경 → 충돌 → origin 유지
      expect(result.c).toBe(4); // target만 변경
    });

    it("중첩된 객체에서 충돌을 감지한다", () => {
      const origin = { a: { b: 1, c: 2 } };
      const source = { a: { b: 10, c: 2 } };
      const target = { a: { b: 20, c: 2 } };
      const { conflict, result } = ObjectUtils.merge3(source, origin, target);

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
      const { conflict, result } = ObjectUtils.merge3(source, origin, target);

      expect(conflict).toBe(true);
      expect(result.a.b).toBe(1); // 충돌 시 origin 유지
      expect(result.a.c).toBe(2);
    });
  });

  //#endregion

  //#region omit / pick

  describe("omit()", () => {
    it("특정 키들을 제외한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ObjectUtils.omit(obj, ["b"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("여러 키를 제외한다", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = ObjectUtils.omit(obj, ["a", "c"]);

      expect(result).toEqual({ b: 2, d: 4 });
    });
  });

  describe("omitByFilter()", () => {
    it("조건에 맞는 키를 제외한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ObjectUtils.omitByFilter(obj, (key) => key === "b");

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  describe("pick()", () => {
    it("특정 키들만 선택한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ObjectUtils.pick(obj, ["a", "c"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });
  });

  //#endregion

  //#region chain value

  describe("getChainValue()", () => {
    it("점 표기법으로 값을 가져온다", () => {
      const obj = { a: { b: { c: 1 } } };

      expect(ObjectUtils.getChainValue(obj, "a.b.c")).toBe(1);
    });

    it("배열 표기법으로 값을 가져온다", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };

      expect(ObjectUtils.getChainValue(obj, "arr[1].name")).toBe("second");
    });

    it("optional: true로 없는 경로는 undefined를 반환한다", () => {
      const obj = { a: 1 };

      expect(ObjectUtils.getChainValue(obj, "b.c.d", true)).toBe(undefined);
    });
  });

  describe("getChainValueByDepth()", () => {
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

      const result = ObjectUtils.getChainValueByDepth(obj, "parent", 2);

      expect(result).toEqual({ parent: { name: "leaf" } });
    });

    it("depth가 0이면 원본을 반환한다", () => {
      const obj = { parent: { name: "child" } };

      const result = ObjectUtils.getChainValueByDepth(obj, "parent", 0);

      expect(result).toBe(obj);
    });

    it("depth가 1이면 한 단계만 내려간다", () => {
      const obj = { parent: { name: "child" } };

      const result = ObjectUtils.getChainValueByDepth(obj, "parent", 1);

      expect(result).toEqual({ name: "child" });
    });

    it("optional: true로 중간 경로가 없으면 undefined를 반환한다", () => {
      const obj = { parent: { name: "child" } };

      const result = ObjectUtils.getChainValueByDepth(obj, "parent", 5, true);

      expect(result).toBe(undefined);
    });

    it("optional 없이 중간 경로가 없으면 에러 발생 가능", () => {
      const obj = { parent: undefined as unknown };

      // optional이 없으면 undefined에서 키를 접근하려 해서 에러 발생 가능
      // 하지만 현재 구현에서는 result == null 체크가 optional 조건 내에서만 동작
      // 따라서 optional 없이 사용 시 주의 필요
      expect(() => ObjectUtils.getChainValueByDepth(obj as any, "parent", 2)).toThrow();
    });
  });

  describe("setChainValue()", () => {
    it("점 표기법으로 값을 설정한다", () => {
      const obj: Record<string, unknown> = {};
      ObjectUtils.setChainValue(obj, "a.b.c", 1);

      expect(obj).toEqual({ a: { b: { c: 1 } } });
    });

    it("기존 값을 덮어쓴다", () => {
      const obj = { a: { b: { c: 1 } } };
      ObjectUtils.setChainValue(obj, "a.b.c", 2);

      expect(obj.a.b.c).toBe(2);
    });

    it("빈 체인은 에러를 던진다", () => {
      const obj: Record<string, unknown> = {};

      expect(() => ObjectUtils.setChainValue(obj, "", 1)).toThrow();
    });
  });

  describe("deleteChainValue()", () => {
    it("체인 경로의 값을 삭제한다", () => {
      const obj = { a: { b: { c: 1, d: 2 } } };
      ObjectUtils.deleteChainValue(obj, "a.b.c");

      expect(obj.a.b).toEqual({ d: 2 });
    });

    it("존재하지 않는 경로는 에러 없이 무시한다", () => {
      const obj = { a: 1 };

      // 중간 경로가 없어도 에러 없음
      expect(() => ObjectUtils.deleteChainValue(obj, "b.c.d")).not.toThrow();
      expect(obj).toEqual({ a: 1 });
    });

    it("중간 경로가 undefined여도 에러 없이 무시한다", () => {
      const obj: Record<string, unknown> = { a: undefined };

      expect(() => ObjectUtils.deleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: undefined });
    });

    it("중간 경로가 null이어도 에러 없이 무시한다", () => {
      const obj: Record<string, unknown> = { a: null };

      expect(() => ObjectUtils.deleteChainValue(obj, "a.b.c")).not.toThrow();
      expect(obj).toEqual({ a: null });
    });

    it("배열 인덱스 경로도 삭제한다", () => {
      const obj = { arr: [{ name: "first" }, { name: "second" }] };
      ObjectUtils.deleteChainValue(obj, "arr[0].name");

      expect(obj.arr[0]).toEqual({});
      expect(obj.arr[1]).toEqual({ name: "second" });
    });

    it("빈 체인은 에러를 던진다", () => {
      const obj = { a: 1 };

      expect(() => ObjectUtils.deleteChainValue(obj, "")).toThrow();
    });
  });

  //#endregion

  //#region clear / transform

  describe("clearUndefined()", () => {
    it("undefined 값을 가진 키를 삭제한다", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = ObjectUtils.clearUndefined(obj);

      expect(result).toEqual({ a: 1, c: 3 });
      expect("b" in result).toBe(false);
    });
  });

  describe("clear()", () => {
    it("모든 키를 삭제한다", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = ObjectUtils.clear(obj);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("nullToUndefined()", () => {
    it("null을 undefined로 변환한다", () => {
      expect(ObjectUtils.nullToUndefined(null)).toBe(undefined);
    });

    it("중첩된 null도 변환한다", () => {
      const obj = { a: 1, b: null, c: { d: null } };
      const result = ObjectUtils.nullToUndefined(obj);

      expect(result).toEqual({ a: 1, b: undefined, c: { d: undefined } });
    });

    it("배열의 null도 변환한다", () => {
      const arr = [1, null, { a: null }];
      const result = ObjectUtils.nullToUndefined(arr);

      expect(result).toEqual([1, undefined, { a: undefined }]);
    });
  });

  describe("unflattenObject()", () => {
    it("flat된 객체를 nested로 변환한다", () => {
      const flat = { "a.b.c": 1, "a.b.d": 2, "e": 3 };
      const result = ObjectUtils.unflattenObject(flat);

      expect(result).toEqual({
        a: { b: { c: 1, d: 2 } },
        e: 3,
      });
    });
  });

  //#endregion
});
