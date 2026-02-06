import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LazyGcMap } from "@simplysm/core-common";

describe("LazyGcMap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

    it("dispose로 모든 값을 삭제한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.set("key2", 200);
      expect(map.size).toBe(2);

      map.dispose();
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

      // expireTime(200) + gcInterval(100) = 300ms 후 GC 실행됨
      await vi.advanceTimersByTimeAsync(350);

      expect(map.has("key1")).toBe(false);
    });

    it("접근하면 만료 시간이 갱신된다 (LRU)", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      // 150ms마다 접근 (expireTime 200ms보다 짧음)
      await vi.advanceTimersByTimeAsync(150);
      map.get("key1"); // 접근 → 시간 갱신

      await vi.advanceTimersByTimeAsync(150);
      map.get("key1"); // 접근 → 시간 갱신

      await vi.advanceTimersByTimeAsync(150);

      // 계속 접근했으므로 만료 안 됨
      expect(map.has("key1")).toBe(true);
    });

    it("has()는 접근 시간을 갱신하지 않는다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      // 150ms마다 has()만 호출 (get()이 아님)
      await vi.advanceTimersByTimeAsync(150);
      map.has("key1"); // has()는 접근 시간을 갱신하지 않음

      await vi.advanceTimersByTimeAsync(150);
      map.has("key1"); // has()는 접근 시간을 갱신하지 않음

      await vi.advanceTimersByTimeAsync(100);

      // has()는 접근 시간을 갱신하지 않으므로 만료됨
      expect(map.has("key1")).toBe(false);
    });

    it("getOrCreate도 접근 시간을 갱신한다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      await vi.advanceTimersByTimeAsync(150);
      map.getOrCreate("key1", () => 200); // 접근 → 시간 갱신

      await vi.advanceTimersByTimeAsync(150);

      expect(map.has("key1")).toBe(true);
    });

    it("여러 항목 중 만료된 것만 삭제한다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);
      await vi.advanceTimersByTimeAsync(150);
      map.set("key2", 200); // key1보다 150ms 늦게 추가

      await vi.advanceTimersByTimeAsync(200);

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
      await vi.advanceTimersByTimeAsync(350);

      expect(map.size).toBe(0);
      // GC 타이머 중지 확인 (더 기다려도 문제 없음)
      await vi.advanceTimersByTimeAsync(200);
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
      await vi.advanceTimersByTimeAsync(350);

      expect(expired).toEqual([["key1", 100]]);
    });

    it("비동기 onExpire 콜백도 지원한다", async () => {
      const expired: Array<[string, number]> = [];
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: async (key, value) => {
          await new Promise((r) => setTimeout(r, 10));
          expired.push([key, value]);
        },
      });

      map.set("key1", 100);
      // expireTime(200) + gcInterval(100) + callback(10) = 310ms
      await vi.advanceTimersByTimeAsync(350);

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
      await vi.advanceTimersByTimeAsync(350);

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
      await vi.advanceTimersByTimeAsync(350);

      // 에러가 발생해도 만료는 정상 처리됨
      expect(expired).toEqual([["key1", 100]]);
      expect(map.has("key1")).toBe(false);
    });

    it("onExpire 중 같은 키로 set() 호출 시 새 값이 유지된다", async () => {
      let map: LazyGcMap<string, number>;
      const expired: Array<[string, number]> = [];

      map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
          // onExpire 콜백 중에 같은 키로 새 값 등록
          map.set(key, value + 1000);
        },
      });

      map.set("key1", 100);
      await vi.advanceTimersByTimeAsync(350);

      // onExpire는 호출되었지만, 새로 등록된 값은 삭제되지 않음
      expect(expired).toEqual([["key1", 100]]);
      expect(map.has("key1")).toBe(true);
      expect(map.get("key1")).toBe(1100);
    });

    it("onExpire 중 다른 키로 set() 호출은 영향 없다", async () => {
      let map: LazyGcMap<string, number>;
      const expired: Array<[string, number]> = [];

      map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
          // onExpire 콜백 중에 다른 키로 새 값 등록 (key1 만료 시에만)
          if (key === "key1") {
            map.set("key2", 200);
          }
        },
      });

      map.set("key1", 100);
      // expireTime(200) + gcInterval(100) = 300ms 후 GC
      // key2가 등록된 후에도 아직 만료되지 않아야 함
      await vi.advanceTimersByTimeAsync(350);

      // key1은 만료 삭제됨
      expect(expired).toEqual([["key1", 100]]);
      expect(map.has("key1")).toBe(false);
      // key2는 새로 등록됨 (아직 만료 전)
      expect(map.has("key2")).toBe(true);
      expect(map.get("key2")).toBe(200);
    });
  });

  //#endregion

  //#region dispose (타이머 및 리소스 정리)

  describe("dispose() - 타이머 정리", () => {
    it("dispose 후 타이머가 정리되어 GC 콜백이 호출되지 않는다", async () => {
      const expired: Array<[string, number]> = [];
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
        },
      });

      map.set("key1", 100);
      expect(map.has("key1")).toBe(true);

      // dispose 호출로 타이머 정리
      map.dispose();
      expect(map.size).toBe(0);

      // expireTime + gcInterval 이상 대기
      await vi.advanceTimersByTimeAsync(400);

      // GC 콜백이 호출되지 않아야 함 (dispose로 이미 정리됨)
      expect(expired).toHaveLength(0);
    });

    it("dispose 후 set은 무시된다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);
      map.dispose();

      // dispose 후 set은 무시됨
      map.set("key2", 200);
      expect(map.has("key2")).toBe(false);
      expect(map.get("key2")).toBeUndefined();
      expect(map.size).toBe(0);
    });

    it("dispose는 여러 번 호출해도 안전하다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);

      // 여러 번 호출해도 에러 없음
      map.dispose();
      map.dispose();
      map.dispose();

      expect(map.size).toBe(0);
    });

    it("using 문으로 자동 dispose된다", async () => {
      const expired: Array<[string, number]> = [];
      {
        using map = new LazyGcMap<string, number>({
          gcInterval: 100,
          expireTime: 200,
          onExpire: (key, value) => {
            expired.push([key, value]);
          },
        });
        map.set("key1", 100);
        expect(map.has("key1")).toBe(true);
      } // using 블록 종료 시 dispose 자동 호출
      await vi.advanceTimersByTimeAsync(350);
      // dispose로 정리됨 (onExpire 미호출)
      expect(expired).toHaveLength(0);
    });
  });

  //#endregion

  //#region clear

  describe("clear()", () => {
    it("모든 항목을 삭제한다", () => {
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

    it("clear 후 새 항목을 추가할 수 있다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.clear();

      map.set("key2", 200);
      expect(map.has("key2")).toBe(true);
      expect(map.get("key2")).toBe(200);
    });

    it("clear는 여러 번 호출해도 안전하다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);

      // 여러 번 호출해도 에러 없음
      map.clear();
      map.clear();
      map.clear();

      expect(map.size).toBe(0);
    });

    it("clear 후 GC가 정상 작동한다", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);
      map.clear();

      // clear 후 새 항목 추가
      map.set("key2", 200);

      // GC가 정상 작동하는지 확인
      await vi.advanceTimersByTimeAsync(350);
      expect(map.has("key2")).toBe(false);
    });
  });

  //#endregion

  //#region SharedArrayBuffer 지원

  describe("SharedArrayBuffer 지원", () => {
    it("SharedArrayBuffer를 값으로 사용할 수 있다", () => {
      // SharedArrayBuffer는 일부 환경에서 보안상 비활성화될 수 있음
      if (typeof SharedArrayBuffer === "undefined") {
        expect(true).toBe(true); // 환경에서 지원하지 않으면 스킵
        return;
      }

      const map = new LazyGcMap<string, SharedArrayBuffer>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      const buffer = new SharedArrayBuffer(16);
      map.set("key1", buffer);

      expect(map.get("key1")).toBe(buffer);
      expect(map.get("key1")?.byteLength).toBe(16);
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

  //#region dispose 후 안전성

  describe("dispose 후 안전성", () => {
    it("dispose 후 get은 undefined를 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect(map.get("a")).toBeUndefined();
    });

    it("dispose 후 has는 false를 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect(map.has("a")).toBe(false);
    });

    it("dispose 후 delete는 false를 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect(map.delete("a")).toBe(false);
    });

    it("dispose 후 getOrCreate는 에러를 던진다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.dispose();
      expect(() => map.getOrCreate("a", () => 1)).toThrow();
    });

    it("dispose 후 clear는 에러 없이 무시된다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.dispose();
      expect(() => map.clear()).not.toThrow();
    });

    it("dispose 후 values는 빈 이터레이터를 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect([...map.values()]).toEqual([]);
    });

    it("dispose 후 keys는 빈 이터레이터를 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect([...map.keys()]).toEqual([]);
    });

    it("dispose 후 entries는 빈 이터레이터를 반환한다", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect([...map.entries()]).toEqual([]);
    });
  });

  //#endregion
});
