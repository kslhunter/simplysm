# @simplysm/core-browser — IndexedDB 영속화

브라우저 IndexedDB를 저장소로 사용하는 작업에서 함께 읽는 묶음이다. `IndexedDbStore`는 IndexedDB 데이터베이스의 연결·트랜잭션·CRUD 작업을 감싸는 래퍼이고, `IndexedDbVirtualFs`는 경로 키 기반 파일과 디렉터리 엔트리를 `IndexedDbStore` 위에 저장한다.

## StoreConfig

```ts
interface StoreConfig {
  name: string;
  keyPath: string;
}
```

오브젝트 스토어를 정의하는 설정 객체이다. `IndexedDbStore` 생성자에 배열로 전달되며, 데이터베이스 upgrade 시 누락된 스토어를 생성하는 데 쓰인다.

- `name` — 오브젝트 스토어의 이름. `onupgradeneeded` 콜백에서 해당 이름의 스토어가 없으면 `db.createObjectStore(name, { keyPath })`로 생성한다.
- `keyPath` — 스토어 레코드에서 키로 쓸 필드의 이름. 스토어 생성 시 `keyPath` 옵션으로 전달되며, 모든 레코드는 이 필드를 포함해야 한다.

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

IndexedDB 데이터베이스 연결과 트랜잭션, CRUD 작업을 관리한다.

- `constructor.dbName` — 열 IndexedDB 데이터베이스의 이름. `indexedDB.open(dbName, dbVersion)`의 첫 번째 인자로 전달된다.
- `constructor.dbVersion` — 데이터베이스 버전 번호. `indexedDB.open`의 두 번째 인자이며, 버전이 올라가면 upgrade 흐름이 실행된다.
- `constructor.storeConfigs` — 이 데이터베이스가 보장할 오브젝트 스토어 목록. upgrade 시 누락된 스토어만 생성하며, 이미 있는 스토어는 다시 만들지 않는다.
- `open()` — 데이터베이스를 연다. 이미 열려 있으면 캐시된 `_db`를 재사용하고, 오픈 중이면 진행 중인 `_opening` Promise를 반환하여 중복 연결을 방지한다.
- `open()` upgrade — `onupgradeneeded` 콜백에서 `storeConfigs`를 순회하며 누락된 스토어만 생성한다.
- `open()` 성공 — `onversionchange` 또는 `onclose` 이벤트가 발생하면 DB를 닫고 내부 `_db`와 `_opening` 캐시를 비워 다음 `open()` 호출 시 재연결하도록 한다.
- `open()` 실패 — `onerror` 콜백은 `req.error`로 reject하고, `onblocked` 콜백은 `Error("다른 연결에 의해 데이터베이스가 차단되었습니다")`로 reject한다.
- `withStore(storeName, mode, fn)` — 트랜잭션을 열고 콜백 함수를 실행한다. `db.transaction(storeName, mode)`로 트랜잭션을 생성하고, `fn(store)`를 먼저 await한 후 트랜잭션 완료를 기다린다.
- `withStore.mode` — 트랜잭션 모드. 내부 구현: `get`/`getAll`은 `"readonly"`, `put`/`delete`는 `"readwrite"`를 사용한다. 사용자가 직접 호출할 때는 명시적으로 지정해야 한다.
- `withStore` 성공 경로 — `fn`이 정상 반환하면 `tx.oncomplete` 콜백에서 그 결과값으로 resolve한다.
- `withStore` 실패 경로 — `fn`이 throw하면 `tx.abort()`를 호출하고, `tx.onabort`에서 원래 에러로 reject한다. 트랜잭션 오류는 `tx.onerror`에서 `tx.error`로 reject한다.
- `get(storeName, key)` — 단일 레코드를 조회한다. 내부적으로 `withStore(..., "readonly", ...)` 경로에서 `store.get(key)`를 호출한다. 미존재 키는 `undefined`를 반환한다(`TValue | undefined`).
- `put(storeName, value)` — 레코드를 저장한다(insert 또는 update). 내부적으로 `withStore(..., "readwrite", ...)` 경로에서 `store.put(value)`를 호출한다. `value`는 스토어 `keyPath` 필드를 포함한 객체여야 한다.
- `delete(storeName, key)` — 레코드를 삭제한다. 내부적으로 `withStore(..., "readwrite", ...)` 경로에서 `store.delete(key)`를 호출한다.
- `getAll(storeName)` — 스토어의 모든 레코드를 조회한다. 내부적으로 `withStore(..., "readonly", ...)` 경로에서 `store.getAll()`을 호출하고 결과를 `TItem[]`로 반환한다.
- `close()` — 데이터베이스 연결을 닫는다. 열린 DB가 있으면 `db.close()`를 호출하고 `_db`와 `_opening` 캐시를 비운다. 이후 작업은 `open()`을 호출하면 다시 연결된다.

## VirtualFsEntry

```ts
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

경로 키 기반 가상 파일시스템의 엔트리를 표현한다.

- `kind` — 엔트리의 종류. `"file"`은 파일, `"dir"`은 디렉터리를 나타낸다. `listChildren` 메서드의 디렉터리 판정에 사용된다.
- `dataBase64` — 파일의 데이터를 base64로 인코딩한 문자열(선택사항). `putEntry` 메서드의 `dataBase64` 인자를 생략하면 `undefined`로 기록된다.

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

경로 키 기반 파일과 디렉터리 엔트리를 IndexedDB에 저장·조회·삭제한다.

- `constructor.db` — 실제 IndexedDB 작업을 수행할 `IndexedDbStore` 인스턴스.
- `constructor.storeName` — 가상 파일트리 엔트리를 저장할 오브젝트 스토어의 이름.
- `constructor.keyField` — 저장되는 레코드에서 전체 경로 키를 담을 필드의 이름. `putEntry`와 `ensureDir`에서 `{ [keyField]: key, ... }` 형태로 레코드를 구성한다.
- `getEntry(fullKey)` — 단일 엔트리를 조회한다. `db.get<VirtualFsEntry>(storeName, fullKey)`를 호출하여 `fullKey`에 해당하는 엔트리를 반환한다. 미존재 키는 `undefined`를 반환한다.
- `putEntry(fullKey, kind, dataBase64?)` — 엔트리를 저장한다. `fullKey`를 `keyField` 값으로 하고, `kind`(`"file"` 또는 `"dir"`)와 선택적 `dataBase64`를 함께 레코드로 저장한다. `dataBase64`를 생략하면 `undefined`로 기록된다.
- `deleteByPrefix(keyPrefix)` — 경로 prefix로 시작하는 엔트리를 모두 삭제한다. `IDBKeyRange.bound(keyPrefix, keyPrefix + "￿")`로 커서를 열고, 키가 `keyPrefix`와 정확히 같거나 `keyPrefix + "/"`로 시작하는 항목을 `cursor.delete()`로 삭제한다. 하나라도 삭제했으면 `true`, 아무것도 삭제하지 않았으면 `false`를 반환한다.
- `listChildren(prefix)` — 경로 prefix 아래의 직계 자식들을 나열한다. `prefix`로 시작하는 키들의 나머지 경로를 `/`로 나누어 첫 번째 세그먼트만 수집한다. 반환 배열의 각 항목: `name`은 prefix 뒤 첫 번째 경로 세그먼트, `isDirectory`는 나머지 경로 세그먼트가 더 있거나 엔트리의 `kind`가 `"dir"`이면 `true`, 아니면 `false`.
- `ensureDir(fullKeyBuilder, dirPath)` — 디렉터리 경로가 존재하도록 보장한다. `fullKeyBuilder(path)` 콜백은 누적 경로(`"/"`, `"/a"`, `"/a/b"` 등)를 실제 저장 키로 변환한다. `dirPath`가 `"/"`이면 루트 엔트리 1개를 저장하고, 그 외에는 `/`로 나눈 세그먼트를 순회하며 없는 디렉터리만 생성한다. 전체 작업은 하나의 `"readwrite"` 트랜잭션 안에서 수행되어 원자성을 보장한다.
