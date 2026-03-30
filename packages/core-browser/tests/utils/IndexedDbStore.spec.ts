import { describe, it, expect, afterEach } from "vitest";
import { IndexedDbStore } from "../../src/utils/IndexedDbStore";

let dbCounter = 0;
function uniqueDbName() {
  return `test_db_${Date.now()}_${dbCounter++}`;
}

const STORE_NAME = "items";
const KEY_PATH = "id";

function createStore(dbName?: string) {
  return new IndexedDbStore(dbName ?? uniqueDbName(), 1, [
    { name: STORE_NAME, keyPath: KEY_PATH },
  ]);
}

describe("IndexedDbStore", () => {
  let store: IndexedDbStore;

  afterEach(() => {
    store.close();
  });

  it("put/get: 항목 저장 후 조회하면 값이 일치한다", async () => {
    store = createStore();
    const item = { id: "key1", value: "hello" };

    await store.put(STORE_NAME, item);
    const result = await store.get<{ id: string; value: string }>(STORE_NAME, "key1");

    expect(result).toEqual(item);
  });

  it("getAll: 여러 항목 저장 후 전체 조회하면 배열 크기 및 내용이 일치한다", async () => {
    store = createStore();
    const items = [
      { id: "a", value: 1 },
      { id: "b", value: 2 },
      { id: "c", value: 3 },
    ];

    for (const item of items) {
      await store.put(STORE_NAME, item);
    }

    const result = await store.getAll<{ id: string; value: number }>(STORE_NAME);

    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining(items));
  });

  it("delete: 항목 저장 후 삭제하면 get으로 undefined가 반환된다", async () => {
    store = createStore();
    await store.put(STORE_NAME, { id: "del1", value: "to-delete" });

    await store.delete(STORE_NAME, "del1");

    const result = await store.get(STORE_NAME, "del1");
    expect(result).toBeUndefined();
  });

  it("존재하지 않는 키 get: undefined를 반환한다", async () => {
    store = createStore();

    const result = await store.get(STORE_NAME, "nonexistent");

    expect(result).toBeUndefined();
  });

  it("커넥션 캐싱: 연속 호출 시 동일 DB 커넥션을 재사용한다", async () => {
    store = createStore();

    await store.put(STORE_NAME, { id: "cache1", value: "first" });
    const result1 = await store.get<{ id: string; value: string }>(STORE_NAME, "cache1");

    await store.put(STORE_NAME, { id: "cache2", value: "second" });
    const result2 = await store.get<{ id: string; value: string }>(STORE_NAME, "cache2");

    expect(result1).toEqual({ id: "cache1", value: "first" });
    expect(result2).toEqual({ id: "cache2", value: "second" });
  });

  it("abort 처리: withStore 콜백에서 에러 발생 시 Promise가 reject된다", async () => {
    store = createStore();

    await expect(
      store.withStore(STORE_NAME, "readwrite", () => {
        throw new Error("intentional error");
      }),
    ).rejects.toThrow("intentional error");
  }, 5000);

  it("close 후 재연결: close() 호출 후 get 호출 시 자동으로 재연결되어 정상 동작한다", async () => {
    store = createStore();

    await store.put(STORE_NAME, { id: "reconnect", value: "data" });
    store.close();

    const result = await store.get<{ id: string; value: string }>(STORE_NAME, "reconnect");
    expect(result).toEqual({ id: "reconnect", value: "data" });
  });
});
