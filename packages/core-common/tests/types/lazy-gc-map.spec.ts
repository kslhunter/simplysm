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

  describe("Basic Map operations", () => {
    it("Stores and retrieves values with set/get", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      expect(map.get("key1")).toBe(100);
    });

    it("Checks key existence with has", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      expect(map.has("key1")).toBe(true);
      expect(map.has("key2")).toBe(false);
    });

    it("Deletes values with delete", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      expect(map.delete("key1")).toBe(true);
      expect(map.has("key1")).toBe(false);
      expect(map.delete("key1")).toBe(false); // Already deleted
    });

    it("Deletes all values with dispose", () => {
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

    it("Gets size with size property", () => {
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

    it("Returns undefined for non-existent keys", () => {
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
    it("Creates new value with factory for non-existent keys", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      const value = map.getOrCreate("key1", () => 100);
      expect(value).toBe(100);
      expect(map.get("key1")).toBe(100);
    });

    it("Returns existing value without calling factory", () => {
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

      expect(value).toBe(100); // Existing value
      expect(factoryCalls).toHaveLength(0); // Factory not called
    });

    it("Factory creates new value each time for different keys", () => {
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

  describe("Automatic expiration (GC)", () => {
    it("Automatically deletes values after expireTime without access", async () => {
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

    it("Refreshes expiration time on access (LRU)", async () => {
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

    it("has() does not refresh access time", async () => {
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

    it("getOrCreate also refreshes access time", async () => {
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

    it("Deletes only expired items among multiple items", async () => {
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

    it("GC timer stops when all items expire", async () => {
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

  describe("onExpire callback", () => {
    it("Calls onExpire callback when item expires", async () => {
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

    it("Supports async onExpire callback", async () => {
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

    it("Calls onExpire for each expired item", async () => {
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

    it("Ignores onExpire errors", async () => {
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

    it("Maintains new value if set is called during onExpire for same key", async () => {
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

    it("Unaffected by set during onExpire for different key", async () => {
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

  describe("dispose() - Timer cleanup", () => {
    it("GC callback not called after dispose when timer is cleaned up", async () => {
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

    it("set is ignored after dispose", () => {
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

    it("dispose is safe to call multiple times", () => {
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

    it("Automatically disposed with using statement", async () => {
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
    it("Deletes all items", () => {
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

    it("Can add new items after clear", () => {
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

    it("clear is safe to call multiple times", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);

      // Safe to call multiple times
      map.clear();
      map.clear();
      map.clear();

      expect(map.size).toBe(0);
    });

    it("GC works normally after clear", async () => {
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

  //#region SharedArrayBuffer support

  describe("SharedArrayBuffer support", () => {
    it("Can use SharedArrayBuffer as value", () => {
      // SharedArrayBuffer may be disabled for security in some environments
      if (typeof SharedArrayBuffer === "undefined") {
        expect(true).toBe(true); // Skip if not supported
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
    it("Iterates values with values()", () => {
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

    it("Iterates keys with keys()", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 1000,
        expireTime: 5000,
      });

      map.set("key1", 100);
      map.set("key2", 200);

      const keys = Array.from(map.keys());
      expect(keys).toEqual(["key1", "key2"]);
    });

    it("Iterates entries with entries()", () => {
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

  describe("Safety after dispose", () => {
    it("Returns undefined on get after dispose", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect(map.get("a")).toBeUndefined();
    });

    it("Returns false on has after dispose", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect(map.has("a")).toBe(false);
    });

    it("Returns false on delete after dispose", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect(map.delete("a")).toBe(false);
    });

    it("Throws error on getOrCreate after dispose", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.dispose();
      expect(() => map.getOrCreate("a", () => 1)).toThrow();
    });

    it("clear is safely ignored after dispose without error", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.dispose();
      expect(() => map.clear()).not.toThrow();
    });

    it("Returns empty iterator on values after dispose", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect([...map.values()]).toEqual([]);
    });

    it("Returns empty iterator on keys after dispose", () => {
      const map = new LazyGcMap<string, number>({
        gcInterval: 10000,
        expireTime: 60000,
      });
      map.set("a", 1);
      map.dispose();
      expect([...map.keys()]).toEqual([]);
    });

    it("Returns empty iterator on entries after dispose", () => {
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
