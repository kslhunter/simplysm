# @simplysm/core-browser — IndexedDB 영속화

브라우저 IndexedDB를 저장소로 쓰는 작업에서 함께 읽는 묶음이다. `IndexedDbStore`는 연결·트랜잭션·CRUD를 감싸고, `IndexedDbVirtualFs`는 경로 키 기반 파일/디렉터리 엔트리를 그 위에 저장한다.

## StoreConfig

```ts
interface StoreConfig {
  name: string;
  keyPath: string;
}
```

- `name` — 오브젝트 스토어 이름. `onupgradeneeded`에서 없으면 `createObjectStore(name, { keyPath })`로 만든다.
- `keyPath` — 스토어 레코드에서 키로 쓸 필드명. 스토어 생성 시 `keyPath` 옵션으로 전달된다.

## IndexedDbStore

```ts
class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[]);
  open(): Promise<IDBDatabase>;
  withStore<TResult>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult>;
  get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>;
  put(storeName: string, value: unknown): Promise<void>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
  getAll<TItem>(storeName: string): Promise<TItem[]>;
  close(): void;
}
```

- `constructor.dbName` — 열 데이터베이스 이름. `indexedDB.open(dbName, dbVersion)`에 전달된다.
- `constructor.dbVersion` — 데이터베이스 버전. `indexedDB.open`의 두 번째 인자로 upgrade 흐름을 결정한다.
- `constructor.storeConfigs` — upgrade 시 보장할 오브젝트 스토어 목록. 이미 있는 스토어는 다시 만들지 않는다.
- `open()` — 이미 열린 `_db`가 있으면 재사용하고, 오픈 중인 `_opening`이 있으면 같은 Promise를 반환해 중복 연결을 막는다.
- `open()` upgrade — `onupgradeneeded`에서 `storeConfigs`를 순회하며 누락된 스토어만 생성한다.
- `open()` 성공 — `onversionchange` 또는 `onclose`가 발생하면 DB를 닫고 내부 `_db`/`_opening` 캐시를 비운다.
- `open()` 실패 — `onerror`는 `req.error`로, `onblocked`는 `Error("다른 연결에 의해 데이터베이스가 차단되었습니다")`로 reject한다.
- `withStore(storeName, mode, fn)` — `db.transaction(storeName, mode)`로 트랜잭션을 열고 `fn(store)`를 먼저 await한 뒤 트랜잭션 완료를 기다린다.
- `withStore.mode` — 트랜잭션 모드. `get`/`getAll`은 내부에서 `"readonly"`, `put`/`delete`는 `"readwrite"`를 쓴다.
- `withStore` 성공/실패 — 성공 시 `tx.oncomplete`에서 `fn` 결과로 resolve한다. `fn`이 throw하면 `tx.abort()` 후 원래 에러로 reject하고, 트랜잭션 오류는 `tx.error`로 reject한다.
- `get(storeName, key)` — `"readonly"`로 `store.get(key)`를 호출한다. 미존재 키는 `undefined`를 반환한다(`TValue | undefined`).
- `put(storeName, value)` — `"readwrite"`로 `store.put(value)`를 호출한다. `value`는 스토어 `keyPath` 필드를 포함한 레코드여야 한다.
- `delete(storeName, key)` — `"readwrite"`로 `store.delete(key)`를 호출한다.
- `getAll(storeName)` — `"readonly"`로 `store.getAll()` 결과를 `TItem[]`로 반환한다.
- `close()` — 열린 DB가 있으면 닫고 `_db`/`_opening`을 비운다. 이후 작업은 `open()`으로 다시 연결한다.

## VirtualFsEntry

```ts
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

- `kind` — 엔트리 종류. `"file"`은 파일, `"dir"`은 디렉터리이며 `listChildren`의 디렉터리 판정에 쓰인다.
- `dataBase64` — 파일 데이터로 저장할 base64 문자열. `putEntry`에서 인자를 넘기지 않으면 `undefined`다.

## IndexedDbVirtualFs

```ts
class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string);
  getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>;
  putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>;
  deleteByPrefix(keyPrefix: string): Promise<boolean>;
  listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>;
  ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>;
}
```

- `constructor.db` — 실제 IndexedDB 작업을 수행할 `IndexedDbStore` 래퍼.
- `constructor.storeName` — 가상 파일트리 엔트리를 저장할 오브젝트 스토어 이름.
- `constructor.keyField` — 저장 레코드에서 전체 경로 키를 담을 필드명. `putEntry`·`ensureDir`가 `{ [keyField]: key, ... }` 형태로 기록한다.
- `getEntry(fullKey)` — `fullKey`(전체 경로 키)로 `db.get<VirtualFsEntry>(storeName, fullKey)`를 호출해 엔트리를 조회한다.
- `putEntry(fullKey, kind, dataBase64?)` — `fullKey`를 `keyField` 값으로, `kind`(`"file"`/`"dir"`)와 선택적 `dataBase64`를 함께 레코드로 저장한다. `dataBase64` 생략 시 `undefined`로 기록된다.
- `deleteByPrefix(keyPrefix)` — 상한을 `keyPrefix` + U+FFFF로 잡은 `IDBKeyRange.bound` 커서로 순회하며, 키가 `keyPrefix`와 같거나 `keyPrefix + "/"`로 시작하는 항목만 삭제한다. 하나라도 삭제했으면 `true`, 없으면 `false`를 반환한다.
- `listChildren(prefix)` — `prefix`로 시작하는 키의 나머지 경로 첫 세그먼트를 직계 자식으로 집계한다. 반환 `name`은 prefix 뒤 첫 경로 세그먼트, `isDirectory`는 나머지 세그먼트가 더 있거나 엔트리 `kind`가 `"dir"`이면 `true`다.
- `ensureDir(fullKeyBuilder, dirPath)` — `dirPath`를 보장한다. `fullKeyBuilder(path)`는 누적 경로(`"/"`, `"/a"`, `"/a/b"` 등)를 실제 저장 키로 바꾸는 콜백이다. `dirPath`가 `"/"`이면 루트 엔트리 1개를 저장하고, 그 외에는 `/`로 나눈 세그먼트를 부모부터 누적해 없는 디렉터리만 생성한다. 전체 작업은 하나의 `"readwrite"` 트랜잭션 안에서 실행된다.
