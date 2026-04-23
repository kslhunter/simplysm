# `IndexedDbStore`

IndexedDB를 Promise 기반으로 래핑한 저수준 CRUD 클래스. 생성자에서 DB 이름, 버전, 스토어 설정을 받아 자기 완결적으로 동작한다.

## When to use

- ✅ 브라우저에서 구조화된 데이터를 영속 저장할 때 (캐시, 오프라인 데이터 등)
- ✅ IndexedDB의 콜백 기반 API를 Promise로 사용하고 싶을 때
- ❌ 경로 기반 파일시스템 추상화가 필요 → [`IndexedDbVirtualFs`](./indexed-db-virtual-fs.md)
- ❌ 서버 측 데이터 저장 → `@simplysm/orm-node`

## Signature

```typescript
export class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[])

  open(): Promise<IDBDatabase>
  withStore<TResult>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult>
  get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>
  put(storeName: string, value: unknown): Promise<void>
  delete(storeName: string, key: IDBValidKey): Promise<void>
  getAll<TItem>(storeName: string): Promise<TItem[]>
  close(): void
}
```

## Members

| Member | Kind | Description |
|--------|------|-------------|
| `constructor` | method | DB 이름, 버전, 스토어 설정으로 인스턴스 생성. `open()` 시 설정에 없는 스토어는 자동 생성 |
| `open` | method | DB 연결. 중복 호출에 안전 (이미 열려 있으면 기존 인스턴스 반환). 다른 연결에 의해 차단되면 에러 |
| `withStore` | method | 트랜잭션을 열고 `fn`을 실행. fn이 에러를 던지면 트랜잭션을 abort |
| `get` | method | 키로 단일 항목 조회. 없으면 `undefined` |
| `put` | method | 항목 추가/갱신. value에 keyPath에 해당하는 필드가 포함되어야 함 |
| `delete` | method | 키로 항목 삭제 |
| `getAll` | method | 스토어의 모든 항목 조회 |
| `close` | method | DB 연결 닫기. 내부 상태 초기화 |

## Usage

### 최소 예제

```typescript
import { IndexedDbStore } from "@simplysm/core-browser";

const store = new IndexedDbStore("myDb", 1, [{ name: "items", keyPath: "id" }]);

await store.put("items", { id: "key1", value: "hello" });
const item = await store.get<{ id: string; value: string }>("items", "key1");
store.close();
```

### 전형 예제 — 커스텀 트랜잭션

```typescript
import { IndexedDbStore } from "@simplysm/core-browser";

const store = new IndexedDbStore("appDb", 2, [
  { name: "users", keyPath: "uid" },
  { name: "settings", keyPath: "key" },
]);

// withStore로 저수준 트랜잭션 제어
const count = await store.withStore("users", "readonly", async (objectStore) => {
  return new Promise<number>((resolve, reject) => {
    const req = objectStore.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
});

// 전체 항목 조회
const allUsers = await store.getAll<{ uid: string; name: string }>("users");

store.close();
```

## 🚫 Anti-patterns

### close() 호출 누락

```typescript
// ❌ 연결을 닫지 않으면 다른 탭에서 DB 버전 업그레이드 시 차단됨
const store = new IndexedDbStore("db", 1, configs);
await store.put("items", data);
// close() 없이 방치

// ✅ 사용 후 반드시 close()
const store = new IndexedDbStore("db", 1, configs);
try {
  await store.put("items", data);
} finally {
  store.close();
}
```

**근거**: IndexedDB는 `versionchange` 이벤트 시 열린 연결을 닫아야 다른 탭에서 스키마 업그레이드가 가능하다. 내부에서 `onversionchange` 핸들러가 자동으로 닫기는 하지만, 명시적 정리가 권장된다.

### keyPath 누락된 값으로 put

```typescript
// ❌ StoreConfig에 keyPath: "id"로 설정했는데 id 필드가 없음
await store.put("items", { name: "test" }); // IndexedDB DataError

// ✅ keyPath에 해당하는 필드를 반드시 포함
await store.put("items", { id: "1", name: "test" });
```

**근거**: IndexedDB는 keyPath에 해당하는 필드가 없으면 `DataError`를 발생시킨다.

## Related Types

### `StoreConfig`

```typescript
export interface StoreConfig {
  name: string;
  keyPath: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | object store 이름 |
| `keyPath` | `string` | 기본 키 경로 |
