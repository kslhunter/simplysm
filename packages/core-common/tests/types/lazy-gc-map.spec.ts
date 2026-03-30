import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LazyGcMap } from "@simplysm/core-common";

describe("LazyGcMap", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  //#region Basic Map operations

  describe("기본 Map 연산", () => {
    it("delete로 값 삭제", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      expect(map.delete("key1")).toBe(true);
      expect(map.has("key1")).toBe(false);
      expect(map.delete("key1")).toBe(false); // 이미 삭제됨
    });

    it("dispose로 모든 값 삭제", () => {
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
  });

  //#endregion

  //#region getOrCreate

  describe("getOrCreate()", () => {
    it("존재하지 않는 키에 팩토리로 새 값 생성", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      const value = map.getOrCreate("key1", () => 100);
      expect(value).toBe(100);
      expect(map.get("key1")).toBe(100);
    });

    it("팩토리 호출 없이 기존 값 반환", () => {
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
      expect(factoryCalls).toHaveLength(0); // 팩토리 미호출
    });

    it("다른 키에 대해 매번 팩토리가 새 값 생성", () => {
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

  //#region Automatic expiration (GC)

  describe("자동 만료 (GC)", () => {
    it("접근 없이 expireTime 후 자동 삭제", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100, // GC every 100ms
        expireTime: 200, // Expire after 200ms
      });

      map.set("key1", 100);
      expect(map.has("key1")).toBe(true);

      // GC runs after expireTime(200) + gcInterval(100) = 300ms
      await vi.advanceTimersByTimeAsync(350);

      expect(map.has("key1")).toBe(false);
    });

    it("접근 시 만료 시간 갱신 (LRU)", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      // Access every 150ms (less than expireTime 200ms)
      await vi.advanceTimersByTimeAsync(150);
      map.get("key1"); // Access refreshes time

      await vi.advanceTimersByTimeAsync(150);
      map.get("key1"); // Access refreshes time

      await vi.advanceTimersByTimeAsync(150);

      // Continuous access prevents expiration
      expect(map.has("key1")).toBe(true);
    });

    it("has()는 접근 시간을 갱신하지 않음", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      // Call has() every 150ms (not get())
      await vi.advanceTimersByTimeAsync(150);
      map.has("key1"); // has() does not refresh access time

      await vi.advanceTimersByTimeAsync(150);
      map.has("key1"); // has() does not refresh access time

      await vi.advanceTimersByTimeAsync(100);

      // has() does not refresh, so expires
      expect(map.has("key1")).toBe(false);
    });

    it("getOrCreate도 접근 시간을 갱신", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      await vi.advanceTimersByTimeAsync(150);
      map.getOrCreate("key1", () => 200); // Access refreshes time

      await vi.advanceTimersByTimeAsync(150);

      expect(map.has("key1")).toBe(true);
    });

    it("복수 항목 중 만료된 항목만 삭제", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);
      await vi.advanceTimersByTimeAsync(150);
      map.set("key2", 200); // Added 150ms after key1

      await vi.advanceTimersByTimeAsync(200);

      // key1 expires, key2 still alive
      expect(map.has("key1")).toBe(false);
      expect(map.has("key2")).toBe(true);
    });

    it("모든 항목 만료 시 GC 타이머 중지", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);

      // Wait for expiration
      await vi.advanceTimersByTimeAsync(350);

      expect(map.size).toBe(0);
      // Verify GC timer stopped (waiting more is safe)
      await vi.advanceTimersByTimeAsync(200);
      expect(map.size).toBe(0);
    });
  });

  //#endregion

  //#region onExpire callback

  describe("onExpire 콜백", () => {
    it("항목 만료 시 onExpire 콜백 호출", async () => {
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

    it("비동기 onExpire 콜백 지원", async () => {
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

    it("만료된 각 항목에 대해 onExpire 호출", async () => {
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

    it("onExpire 오류 무시", async () => {
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

      // Expiration handled normally despite error
      expect(expired).toEqual([["key1", 100]]);
      expect(map.has("key1")).toBe(false);
    });

    it("같은 키에 대해 onExpire 중 set 호출 시 새 값 유지", async () => {
      let map: LazyGcMap<string, number>;
      const expired: Array<[string, number]> = [];

      map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
          // Register new value for same key during onExpire
          map.set(key, value + 1000);
        },
      });

      map.set("key1", 100);
      await vi.advanceTimersByTimeAsync(350);

      // onExpire called, but new value not deleted
      expect(expired).toEqual([["key1", 100]]);
      expect(map.has("key1")).toBe(true);
      expect(map.get("key1")).toBe(1100);
    });

    it("다른 키에 대한 onExpire 중 set에 영향 없음", async () => {
      let map: LazyGcMap<string, number>;
      const expired: Array<[string, number]> = [];

      map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
        onExpire: (key, value) => {
          expired.push([key, value]);
          // Register new value for different key during onExpire (only for key1)
          if (key === "key1") {
            map.set("key2", 200);
          }
        },
      });

      map.set("key1", 100);
      // GC runs after expireTime(200) + gcInterval(100) = 300ms
      // key2 not expired yet after being registered
      await vi.advanceTimersByTimeAsync(350);

      // key1 deleted after expiration
      expect(expired).toEqual([["key1", 100]]);
      expect(map.has("key1")).toBe(false);
      // key2 newly registered (not yet expired)
      expect(map.has("key2")).toBe(true);
      expect(map.get("key2")).toBe(200);
    });
  });

  //#endregion

  //#region dispose (Timer and resource cleanup)

  describe("dispose() - 타이머 정리", () => {
    it("타이머 정리 시 dispose 후 GC 콜백 미호출", async () => {
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

      // Clean up timer with dispose
      map.dispose();
      expect(map.size).toBe(0);

      // Wait expireTime + gcInterval or more
      await vi.advanceTimersByTimeAsync(400);

      // GC callback should not be called (already cleaned by dispose)
      expect(expired).toHaveLength(0);
    });

    it("dispose 후 set 무시됨", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);
      map.dispose();

      // set ignored after dispose
      map.set("key2", 200);
      expect(map.has("key2")).toBe(false);
      expect(map.get("key2")).toBeUndefined();
      expect(map.size).toBe(0);
    });

    it("dispose는 여러 번 호출해도 안전", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);

      // Safe to call multiple times
      map.dispose();
      map.dispose();
      map.dispose();

      expect(map.size).toBe(0);
    });

    it("using 문으로 자동 dispose", async () => {
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
      } // dispose auto-called at end of using block
      await vi.advanceTimersByTimeAsync(350);
      // Cleaned up by dispose (onExpire not called)
      expect(expired).toHaveLength(0);
    });
  });

  //#endregion

  //#region clear

  describe("clear()", () => {
    it("모든 항목 삭제", () => {
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

    it("clear 후 새 항목 추가 가능", () => {
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

    it("clear 후 GC 정상 작동", async () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 100,
        expireTime: 200,
      });

      map.set("key1", 100);
      map.clear();

      // Add new item after clear
      map.set("key2", 200);

      // Verify GC works normally
      await vi.advanceTimersByTimeAsync(350);
      expect(map.has("key2")).toBe(false);
    });
  });

  //#endregion

  //#region Iterator

  describe("이터레이터", () => {
    it("values()로 값 순회", () => {
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

    it("keys()로 키 순회", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.set("key2", 200);

      const keys = Array.from(map.keys());
      expect(keys).toEqual(["key1", "key2"]);
    });

    it("entries()로 엔트리 순회", () => {
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

  //#region Safety after dispose

  describe("dispose 후 안전성", () => {
    it("dispose 후 getOrCreate는 오류 발생", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.dispose();
      expect(() => map.getOrCreate("a", () => 1)).toThrow();
    });

    it("dispose 후 clear는 오류 없이 안전하게 무시", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.dispose();
      expect(() => map.clear()).not.toThrow();
    });
  });

  //#endregion
});
