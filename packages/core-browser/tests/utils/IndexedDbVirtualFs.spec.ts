import { describe, it, expect, afterEach } from "vitest";
import { IndexedDbStore } from "../../src/utils/IndexedDbStore";
import { IndexedDbVirtualFs } from "../../src/utils/IndexedDbVirtualFs";

let dbCounter = 0;
function uniqueDbName() {
  return `test_vfs_${Date.now()}_${dbCounter++}`;
}

const STORE_NAME = "files";
const KEY_FIELD = "path";

function createVfs(dbName?: string) {
  const store = new IndexedDbStore(dbName ?? uniqueDbName(), 1, [
    { name: STORE_NAME, keyPath: KEY_FIELD },
  ]);
  const vfs = new IndexedDbVirtualFs(store, STORE_NAME, KEY_FIELD);
  return { store, vfs };
}

describe("IndexedDbVirtualFs", () => {
  let store: IndexedDbStore;

  afterEach(() => {
    store.close();
  });

  it("putEntry + getEntry (file): 파일 저장 후 조회하면 kind와 dataBase64가 일치한다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/a/file.txt", "file", btoa("hello"));
    const entry = await ctx.vfs.getEntry("/a/file.txt");

    expect(entry).toMatchObject({ kind: "file", dataBase64: btoa("hello") });
  });

  it("putEntry + getEntry (dir): 디렉터리 저장 후 조회하면 kind가 dir이다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/a", "dir");
    const entry = await ctx.vfs.getEntry("/a");

    expect(entry).toMatchObject({ kind: "dir" });
  });

  it("getEntry 미존재: 존재하지 않는 키를 조회하면 undefined를 반환한다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    const entry = await ctx.vfs.getEntry("/nonexist");

    expect(entry).toBeUndefined();
  });

  it("deleteByPrefix - prefix 자체 삭제: prefix와 정확히 일치하는 항목이 삭제된다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/a/b", "dir");

    await ctx.vfs.deleteByPrefix("/a/b");

    const entry = await ctx.vfs.getEntry("/a/b");
    expect(entry).toBeUndefined();
  });

  it("deleteByPrefix - 하위 항목 삭제: prefix 하위의 모든 항목이 삭제된다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/a/b", "dir");
    await ctx.vfs.putEntry("/a/b/c", "file", btoa("c"));
    await ctx.vfs.putEntry("/a/b/d", "file", btoa("d"));

    await ctx.vfs.deleteByPrefix("/a/b");

    expect(await ctx.vfs.getEntry("/a/b")).toBeUndefined();
    expect(await ctx.vfs.getEntry("/a/b/c")).toBeUndefined();
    expect(await ctx.vfs.getEntry("/a/b/d")).toBeUndefined();
  });

  it("deleteByPrefix - 무관한 항목 유지: prefix와 무관한 항목은 삭제되지 않는다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/a/b", "dir");
    await ctx.vfs.putEntry("/a/x", "file", btoa("x"));

    await ctx.vfs.deleteByPrefix("/a/b");

    const entry = await ctx.vfs.getEntry("/a/x");
    expect(entry).toMatchObject({ kind: "file", dataBase64: btoa("x") });
  });

  it("deleteByPrefix - 반환값: 삭제 대상이 있으면 true, 없으면 false를 반환한다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/a/b", "dir");

    const resultTrue = await ctx.vfs.deleteByPrefix("/a/b");
    expect(resultTrue).toBe(true);

    const resultFalse = await ctx.vfs.deleteByPrefix("/nonexist");
    expect(resultFalse).toBe(false);
  });

  it("listChildren - 직접 자식 목록: prefix의 직접 자식만 반환한다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/root/a", "file", btoa("a"));
    await ctx.vfs.putEntry("/root/b", "dir");
    await ctx.vfs.putEntry("/root/b/c", "file", btoa("c"));

    const children = await ctx.vfs.listChildren("/root/");

    expect(children).toHaveLength(2);
    const names = children.map((c) => c.name).sort();
    expect(names).toEqual(["a", "b"]);
  });

  it("listChildren - isDirectory 판별: 파일과 디렉터리를 올바르게 구분한다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.putEntry("/root/a", "file", btoa("a"));
    await ctx.vfs.putEntry("/root/b", "dir");
    await ctx.vfs.putEntry("/root/b/c", "file", btoa("c"));

    const children = await ctx.vfs.listChildren("/root/");

    const fileChild = children.find((c) => c.name === "a");
    const dirChild = children.find((c) => c.name === "b");
    expect(fileChild?.isDirectory).toBe(false);
    expect(dirChild?.isDirectory).toBe(true);
  });

  it("ensureDir - 중첩 경로 생성: 중간 디렉터리가 모두 생성된다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.ensureDir((p) => p, "/a/b/c");

    expect(await ctx.vfs.getEntry("/a")).toMatchObject({ kind: "dir" });
    expect(await ctx.vfs.getEntry("/a/b")).toMatchObject({ kind: "dir" });
    expect(await ctx.vfs.getEntry("/a/b/c")).toMatchObject({ kind: "dir" });
  });

  it("ensureDir - 멱등성: 같은 경로로 두 번 호출해도 에러가 발생하지 않는다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.ensureDir((p) => p, "/a/b/c");
    await ctx.vfs.ensureDir((p) => p, "/a/b/c");

    expect(await ctx.vfs.getEntry("/a/b/c")).toMatchObject({ kind: "dir" });
  });

  it("ensureDir - 루트: 루트 경로를 생성하면 getEntry로 조회 가능하다", async () => {
    const ctx = createVfs();
    store = ctx.store;

    await ctx.vfs.ensureDir((p) => p, "/");

    const entry = await ctx.vfs.getEntry("/");
    expect(entry).toMatchObject({ kind: "dir" });
  });
});
