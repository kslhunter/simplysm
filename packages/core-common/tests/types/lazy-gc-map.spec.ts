import { describe, it, expect, vi } from "vitest";
import { LazyGcMap, Wait } from "@simplysm/core-common";

describe("LazyGcMap", () => {
  //#region 기본 Map 동작

  describe("기본 Map 동작", () => {
    it("set/get으로 값을 저장하고 가져온다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      expect(map.get("key1")).toBe(100);
    });

    it("has로 키 존재 여부를 확인한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      expect(map.has("key1")).toBe(true);
      expect(map.has("key2")).toBe(false);
    });

    it("delete로 값을 삭제한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      expect(map.delete("key1")).toBe(true);
      expect(map.has("key1")).toBe(false);
      expect(map.delete("key1")).toBe(false); // 이미 삭제됨
    });

    it("clear로 모든 값을 삭제한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.set("key2", 200);
      expect(map.size).toBe(2);

      map.clear();
      expect(map.size).toBe(0);
      expect(map.has("key1")).toBe(false);
      expect(map.has("key2")).toBe(false);
    });

    it("size로 크기를 확인한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      expect(map.size).toBe(0);
      map.set("key1", 100);
      expect(map.size).toBe(1);
      map.set("key2", 200);
      expect(map.size).toBe(2);
      map.delete("key1");
      expect(map.size).toBe(1);
    });

    it("없는 키를 get하면 undefined를 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      expect(map.get("nonexistent")).toBe(undefined);
    });
  });

  //#endregion

  //#region getOrCreate

  describe("getOrCreate()", () => {
    it("없는 키는 factory로 생성한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      const value = map.getOrCreate("key1", () => 100);
      expect(value).toBe(100);
      expect(map.get("key1")).toBe(100);
    });

    it("있는 키는 기존 값을 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      const factoryCalls: number[] = [];
      const value = map.getOrCreate("key1", () => {
        factoryCalls.push(1);
        return 200;
      });

      expect(value).toBe(100); // 기존 값
      expect(factoryCalls).toHaveLength(0); // factory 호출 안 됨
    });

    it("factory는 호출될 때마다 새 값을 생성한다", () => {
      const map = new LazyGcMap<string, { id: number }>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      const value1 = map.getOrCreate("key1", () => ({ id: 1 }));
      const value2 = map.getOrCreate("key2", () => ({ id: 2 }));

      expect(value1).toEqual({ id: 1 });
      expect(value2).toEqual({ id: 2 });
      expect(value1).not.toBe(value2);
    });
  });

  //#endregion

  //#region 자동 만료 (GC)

  describe("자동 만료 (GC)", () => {
    it("expireTime 이후 미접근 시 자동 삭제된다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100, // 100ms마다 GC
        expireTime: 200, // 200ms 후 만료
      });

      map.set("key1", 100);
      expect(map.has("key1")).toBe(true);

      // 300ms 대기 (expireTime + gcInterval)
      await Wait.time(350);

      expect(map.has("key1")).toBe(false);
    });

    it("접근하면 만료 시간이 갱신된다 (LRU)", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      // 150ms마다 접근 (expireTime 200ms보다 짧음)
      await Wait.time(150);
      map.get("key1"); // 접근 → 시간 갱신

      await Wait.time(150);
      map.get("key1"); // 접근 → 시간 갱신

      await Wait.time(150);

      // 계속 접근했으므로 만료 안 됨
      expect(map.has("key1")).toBe(true);
    });

    it("getOrCreate도 접근 시간을 갱신한다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      await Wait.time(150);
      map.getOrCreate("key1", () => 200); // 접근 → 시간 갱신

      await Wait.time(150);

      expect(map.has("key1")).toBe(true);
    });

    it("여러 항목 중 만료된 것만 삭제한다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);
      await Wait.time(150);
      map.set("key2", 200); // key1보다 150ms 늦게 추가

      await Wait.time(200);

      // key1은 만료, key2는 아직 살아있음
      expect(map.has("key1")).toBe(false);
      expect(map.has("key2")).toBe(true);
    });

    it("모든 항목이 만료되면 GC 타이머가 중지된다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      // 만료 대기
      await Wait.time(350);

      expect(map.size).toBe(0);
      // GC 타이머 중지 확인 (더 기다려도 문제 없음)
      await Wait.time(200);
      expect(map.size).toBe(0);
    });
  });

  //#endregion

  //#region onExpire 콜백

  describe("onExpire 콜백", () => {
    it("만료 시 onExpire 콜백이 호출된다", async () => {
      const expired: Array<[string, number]> = [];
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
        },
      });

      map.set("key1", 100);
      await Wait.time(350);

      expect(expired).toEqual([["key1", 100]]);
    });

    it("비동기 onExpire 콜백도 지원한다", async () => {
      const expired: Array<[string, number]> = [];
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: async (key, value) => {
          await Wait.time(10);
          expired.push([key, value]);
        },
      });

      map.set("key1", 100);
      await Wait.time(350);

      expect(expired).toEqual([["key1", 100]]);
    });

    it("여러 항목 만료 시 각각 onExpire가 호출된다", async () => {
      const expired: Array<[string, number]> = [];
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
        },
      });

      map.set("key1", 100);
      map.set("key2", 200);
      await Wait.time(350);

      expect(expired).toHaveLength(2);
      expect(expired).toContainEqual(["key1", 100]);
      expect(expired).toContainEqual(["key2", 200]);
    });

    it("onExpire 에러는 무시한다", async () => {
      const expired: Array<[string, number]> = [];
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
          throw new Error("callback error");
        },
      });

      map.set("key1", 100);
      await Wait.time(350);

      // 에러가 발생해도 만료는 정상 처리됨
      expect(expired).toEqual([["key1", 100]]);
      expect(map.has("key1")).toBe(false);
    });
  });

  //#endregion

  //#region Iterator

  describe("Iterator", () => {
    it("values()로 값들을 순회한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.set("key2", 200);
      map.set("key3", 300);

      const values = Array.from(map.values());
      expect(values).toHaveLength(3);
      expect(values).toContain(100);
      expect(values).toContain(200);
      expect(values).toContain(300);
    });

    it("keys()로 키들을 순회한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.set("key2", 200);

      const keys = Array.from(map.keys());
      expect(keys).toEqual(["key1", "key2"]);
    });

    it("entries()로 엔트리를 순회한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.set("key2", 200);

      const entries = Array.from(map.entries());
      expect(entries).toEqual([
        ["key1", 100],
        ["key2", 200],
      ]);
    });
  });

  //#endregion
});
