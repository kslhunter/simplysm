# @simplysm/core-browser — IndexedDB 영속화

브라우저 IndexedDB를 저장소로 쓰는 작업에서 함께 읽는 묶음이다. `IndexedDbStore`는 연결·트랜잭션·CRUD를 감싸고, `IndexedDbVirtualFs`는 경로 키 기반 파일/디렉터리 엔트리를 그 위에 저장한다.

## StoreConfig

```ts
interface StoreConfig {
  name: string;
  keyPath: string;
}
```

- `name: string` — 오브젝트 스토어 이름. `onupgradeneeded`에서 없으면 `createObjectStore(name, { keyPath })`로 만든다.
- `keyPath: string` — 스토어 레코드에서 키로 쓸 필드명. 스토어 생성 시 `keyPath` 옵션으로 전달된다.

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

- `constructor.dbName: string` — 열 IndexedDB 데이터베이스 이름. `indexedDB.open(dbName, dbVersion)`에 전달된다.
- `constructor.dbVersion: number` — 열 데이터베이스 버전. `indexedDB.open`의 두 번째 인자로 전달되고 upgrade 흐름을 결정한다.
- `constructor.storeConfigs: StoreConfig[]` — upgrade 시 보장할 오브젝트 스토어 목록. 이미 있는 스토어는 다시 만들지 않는다.
- `open()` — 이미 열린 `_db`가 있으면 재사용하고, 오픈 중인 `_opening`이 있으면 같은 Promise를 반환한다.
- `open()` upgrade — `onupgradeneeded`에서 `storeConfigs`를 순회하며 누락된 스토어만 생성한다.
- `open()` 성공 — `onversionchange` 또는 `onclose`가 발생하면 DB를 닫고 내부 `_db`/`_opening` 캐시를 비운다.
- `open()` 실패 — `onerror`는 `req.error`로 reject하고, `onblocked`는 `Error("다른 연결에 의해 데이터베이스가 차단되었습니다")`로 reject한다.
- `withStore.storeName: string` — `db.transaction(storeName, mode)`에 넘길 스토어 이름이다.
- `withStore.mode: IDBTransactionMode` — 트랜잭션 모드. `get`/`getAll`은 내부에서 `"readonly"`, `put`/`delete`는 `"readwrite"`를 사용한다.
- `withStore.fn: (store: IDBObjectStore) => Promise<TResult>` — 트랜잭션 안에서 실행할 작업. 먼저 await한 뒤 트랜잭션 완료를 기다린다.
- `withStore` 성공 — `fn` 결과를 보관하고 `tx.oncomplete`에서 그 결과로 resolve한다.
- `withStore` 실패 — `fn`이 throw하면 `tx.abort()`를 호출하고 원래 에러로 reject한다. 트랜잭션 오류는 `tx.error`로 reject한다.
- `get.storeName: string` — 읽을 스토어 이름. 내부에서 `withStore(storeName, "readonly", ...)`를 호출한다.
- `get.key: IDBValidKey` — `store.get(key)`에 전달할 키. 미존재 시 IndexedDB 결과 그대로 `undefined`가 반환된다.
- `put.storeName: string` — 쓸 스토어 이름. 내부에서 `withStore(storeName, "readwrite", ...)`를 호출한다.
- `put.value: unknown` — `store.put(value)`에 전달할 레코드다.
- `delete.storeName: string` — 삭제할 스토어 이름. 내부에서 `withStore(storeName, "readwrite", ...)`를 호출한다.
- `delete.key: IDBValidKey` — `store.delete(key)`에 전달할 키다.
- `getAll.storeName: string` — 전체 조회할 스토어 이름. `store.getAll()` 결과를 `TItem[]`로 반환한다.
- `close()` — 열린 DB가 있으면 닫고 `_db`/`_opening`을 `undefined`로 비운다. 이후 작업은 `open()`을 통해 다시 연결한다.

## VirtualFsEntry

```ts
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

- `kind: "file" | "dir"` — 엔트리 종류. `"file"`은 파일, `"dir"`은 디렉터리이며 `listChildren`의 디렉터리 판정에 사용된다.
- `dataBase64?: string` — 파일 데이터로 저장할 base64 문자열. `putEntry`에서 인자를 넘기지 않으면 필드 값은 `undefined`다.

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

- `constructor.db: IndexedDbStore` — 실제 IndexedDB 작업을 수행할 저장소 래퍼다.
- `constructor.storeName: string` — 가상 파일트리 엔트리를 저장할 오브젝트 스토어 이름이다.
- `constructor.keyField: string` — 저장 레코드에서 전체 경로 키를 담을 필드명. `putEntry`와 `ensureDir`가 `{ [keyField]: key, ... }` 형태로 기록한다.
- `getEntry.fullKey: string` — 조회할 전체 경로 키. 내부에서 `db.get<VirtualFsEntry>(storeName, fullKey)`를 호출한다.
- `putEntry.fullKey: string` — 저장할 전체 경로 키. 레코드의 `keyField` 값으로 들어간다.
- `putEntry.kind: "file" | "dir"` — 저장할 엔트리 종류. `"file"`은 파일, `"dir"`은 디렉터리로 기록된다.
- `putEntry.dataBase64?: string` — 함께 저장할 base64 데이터. 생략하면 `dataBase64` 값은 `undefined`다.
- `deleteByPrefix.keyPrefix: string` — 삭제 기준 경로 키. 커서는 `IDBKeyRange.bound(keyPrefix, keyPrefix + "\uffff")`로 열고, 실제 삭제는 키가 `keyPrefix`와 같거나 `keyPrefix + "/"`로 시작할 때만 수행한다.
- `deleteByPrefix` 반환 `boolean` — 삭제한 항목이 하나라도 있으면 `true`, 없으면 `false`다.
- `listChildren.prefix: string` — 나열할 부모 prefix. 키가 prefix로 시작하면 나머지 경로의 첫 세그먼트를 직계 자식 이름으로 집계한다.
- `listChildren` 반환 `name: string` — prefix 뒤의 첫 경로 세그먼트다.
- `listChildren` 반환 `isDirectory: boolean` — 나머지 세그먼트가 더 있거나 엔트리 `kind`가 `"dir"`이면 `true`, 아니면 `false`다.
- `ensureDir.fullKeyBuilder: (path: string) => string` — 누적 디렉터리 경로를 실제 저장 키로 바꾸는 콜백. 루트에서는 `"/"`, 중첩에서는 `"/a"`, `"/a/b"` 같은 누적 경로로 호출된다.
- `ensureDir.dirPath: string` — 보장할 디렉터리 경로. `"/"`이면 루트 엔트리 1개를 저장하고, 그 외에는 `/`로 나눈 세그먼트를 부모부터 누적해 없는 디렉터리만 생성한다.
- `ensureDir` 트랜잭션 — 전체 디렉터리 보장 작업은 `db.withStore(storeName, "readwrite", ...)` 하나 안에서 실행된다.
