import { describe, it, expect, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { LmdbCacheStore } from "../../src/esbuild/lmdb-cache-store.js";

describe("LmdbCacheStore", () => {
  let tmpDir: string;
  let store: LmdbCacheStore;

  function createStore(): LmdbCacheStore {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lmdb-test-"));
    store = new LmdbCacheStore(path.join(tmpDir, "test.db"));
    return store;
  }

  afterEach(async () => {
    await store.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  //#region Acceptance Tests

  describe("값 저장 및 조회", () => {
    it("set한 값을 get으로 조회할 수 있다", async () => {
      createStore();

      const value = new Uint8Array([1, 2, 3]);
      await store.set("key1", value);

      const result = store.get("key1");
      // lmdb는 Uint8Array를 Buffer로 반환하므로 바이트 내용만 비교
      expect(new Uint8Array(result as Uint8Array)).toEqual(value);
    });
  });

  describe("close 후 리소스 해제", () => {
    it("close 호출이 에러 없이 완료된다", async () => {
      createStore();
      await store.set("k", "v");

      await expect(store.close()).resolves.toBeUndefined();
    });
  });

  //#endregion

  //#region Unit Tests — Edge Cases

  it("존재하지 않는 키 조회 시 undefined를 반환한다", () => {
    createStore();

    const result = store.get("nonexistent");
    expect(result).toBeUndefined();
  });

  //#endregion
});
