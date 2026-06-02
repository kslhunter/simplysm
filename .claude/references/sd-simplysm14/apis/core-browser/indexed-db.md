# @simplysm/core-browser — IndexedDB 저장소/가상 파일시스템

브라우저 IndexedDB 를 다룰 때 함께 읽히는 묶음. `IndexedDbStore` 는 연결·트랜잭션·KV CRUD 를 담당하고, `IndexedDbVirtualFs` 는 그 위에 경로 키 기반 가상 파일트리(entry put/get, prefix 삭제, 자식 나열, 디렉터리 보장)를 얹음.

## IndexedDbStore

IndexedDB 연결을 지연 오픈·재사용하고, 스토어 단위 트랜잭션과 기본 KV 작업을 비동기로 감싼 클래스.

```ts
const store = new IndexedDbStore("appDb", 1, [{ name: "files", keyPath: "key" }]);
await store.put("files", { key: "a", data: "..." });
const v = await store.get<MyType>("files", "a");
const all = await store.getAll<MyType>("files");
await store.delete("files", "a");
store.close();
```

시그니처:

- `new IndexedDbStore(dbName: string, dbVersion: number, storeConfigs: StoreConfig[])` — DB 이름·버전·스토어 설정으로 생성(연결은 지연, 첫 작업 시 오픈).
  - dbName: `string` — IndexedDB 데이터베이스 이름.
  - dbVersion: `number` — DB 버전. 올리면 `onupgradeneeded` 에서 누락 스토어를 생성. 스키마(스토어 추가) 변경 시 증가.
  - storeConfigs: `StoreConfig[]` — 생성할 오브젝트 스토어 목록.
- `StoreConfig` — 스토어 설정 항목.
  - name: `string` — 오브젝트 스토어 이름. upgrade 시 미존재면 `createObjectStore` 로 생성.
  - keyPath: `string` — 스토어 keyPath(레코드에서 키로 쓸 속성명).
- `open(): Promise<IDBDatabase>` — 연결을 열어 반환. 이미 열렸으면 캐시 반환, 진행 중이면 같은 Promise 공유(중복 오픈 방지). `onupgradeneeded` 시 없는 스토어만 생성. `onversionchange`/`onclose` 시 내부 캐시(`_db`/`_opening`)를 해제해 다음 호출에 재오픈. `onblocked` 면 `Error("다른 연결에 의해 데이터베이스가 차단되었습니다")`, `onerror` 면 원본 에러로 reject. CRUD 가 자동 호출하므로 직접 호출 불필요.
- `withStore<TResult>(storeName, mode, fn): Promise<TResult>` — 트랜잭션 1건 안에서 `fn(store)` 실행 후 완료까지 대기. `fn` 이 throw 하면 `tx.abort()` 후 그 에러로 reject(롤백), 정상이면 `oncomplete` 시 결과 resolve, `onerror` 면 `tx.error` 로 reject. 커서 등 저수준 IDB 작업을 감쌀 때.
  - storeName: `string` — 트랜잭션 대상 스토어.
  - mode: `IDBTransactionMode` — `"readonly"`(읽기 전용) | `"readwrite"`(읽기·쓰기) | `"versionchange"`. 쓰기 작업이면 `"readwrite"`.
  - fn: `(store: IDBObjectStore) => Promise<TResult>` — 스토어를 받아 작업하는 콜백.
- `get<TValue>(storeName, key): Promise<TValue | undefined>` — 키로 단건 조회. 미존재 시 `undefined`(결측 그대로 반환).
- `put(storeName, value): Promise<void>` — 레코드 upsert. value 에 keyPath 속성이 포함돼야 함.
- `delete(storeName, key): Promise<void>` — 키로 단건 삭제.
- `getAll<TItem>(storeName): Promise<TItem[]>` — 스토어 전체 레코드 배열 반환.
- `close(): void` — 연결을 닫고 내부 캐시 해제. 다음 작업 시 재오픈. 페이지 정리 시 호출.

주의:

- `withStore` 의 fn 이 throw 하면 트랜잭션 전체 abort — 다건 쓰기를 하나의 `withStore` 안에 묶으면 원자성 보장.
- 버전 변경(`onupgradeneeded`)은 누락 스토어 생성만 함 — 기존 스토어 스키마 변경·인덱스 추가는 별도 처리 필요.

## IndexedDbVirtualFs

`IndexedDbStore` 의 한 스토어를 경로 키 기반 가상 파일시스템처럼 다루는 래퍼. 키는 `keyField` 속성에 들어가는 전체 경로 문자열이고, 각 레코드는 `VirtualFsEntry`(파일/디렉터리 + 선택적 base64 데이터).

```ts
const fs = new IndexedDbVirtualFs(store, "files", "key");
await fs.ensureDir((p) => `/root${p}`, "/a/b"); // /root/a, /root/a/b 디렉터리 보장
await fs.putEntry("/root/a/x.txt", "file", base64);
const children = await fs.listChildren("/root/a/"); // [{ name, isDirectory }]
const ok = await fs.deleteByPrefix("/root/a"); // 하위 전체 삭제, 삭제분 있으면 true
```

시그니처:

- `new IndexedDbVirtualFs(db: IndexedDbStore, storeName: string, keyField: string)` — 백엔드 store·스토어 이름·키 필드명으로 생성.
  - db: `IndexedDbStore` — 백엔드 저장소.
  - storeName: `string` — 사용할 오브젝트 스토어 이름.
  - keyField: `string` — 레코드에서 경로 키를 담는 속성명(스토어 keyPath 와 일치해야 함).
- `VirtualFsEntry` — 저장 엔트리 타입.
  - kind: `"file" | "dir"` — 엔트리 종류. `"file"` = 파일, `"dir"` = 디렉터리. 자식 나열·디렉터리 판정에 사용.
  - dataBase64: `string` — 파일 내용 base64. 디렉터리거나 빈 파일이면 생략(undefined).
- `getEntry(fullKey): Promise<VirtualFsEntry | undefined>` — 전체 경로 키로 단건 조회. 미존재 시 `undefined`.
- `putEntry(fullKey, kind, dataBase64?): Promise<void>` — 엔트리 저장. `keyField` 에 `fullKey`, 그리고 `kind`/`dataBase64` 를 함께 기록.
  - fullKey: `string` — 저장할 전체 경로 키.
  - kind: `"file" | "dir"` — 저장할 엔트리 종류.
  - dataBase64: `string` — 파일 데이터(base64). 디렉터리면 생략.
- `deleteByPrefix(keyPrefix): Promise<boolean>` — 커서로 키가 `keyPrefix` 자신이거나 `keyPrefix + "/"` 로 시작하는 엔트리 전부 삭제(같은 접두어를 가진 다른 형제 경로 오삭제 방지). 하나라도 지웠으면 `true`, 없으면 `false`. 디렉터리 트리 통째 삭제에.
- `listChildren(prefix): Promise<{ name: string; isDirectory: boolean }[]>` — `prefix` 직계 자식만 집계. 키에서 prefix 제거 후 첫 세그먼트를 이름으로 삼고, 하위 세그먼트가 더 있거나 엔트리 `kind === "dir"` 면 디렉터리로 판정. 디렉터리 목록 표시용(재귀 아님).
  - 반환 항목 name: `string` — 직계 자식 이름(첫 경로 세그먼트).
  - 반환 항목 isDirectory: `boolean` — 디렉터리 여부.
- `ensureDir(fullKeyBuilder, dirPath): Promise<void>` — `dirPath` 상의 각 중간 디렉터리를 부모부터 누적 경로마다 없으면 생성. `dirPath === "/"` 면 루트 1건만 생성. 단일 `withStore("readwrite")` 트랜잭션으로 처리(원자적). 파일 쓰기 전 상위 디렉터리 보장에.
  - fullKeyBuilder: `(path: string) => string` — 누적 경로(예: `/a`, `/a/b`)를 실제 저장 key 로 변환하는 콜백.
  - dirPath: `string` — 보장할 디렉터리 경로(`/` 구분). 빈 세그먼트는 무시.

주의:

- 모든 범위 조회는 `IDBKeyRange.bound(prefix, prefix + "￿")` 기반 — 호출측이 fullKey 규칙을 일관되게 유지해 prefix 가 정확한 경로 경계를 갖게 해야 함.
- `listChildren` 은 직계만 반환(재귀 아님). 트리 전체 순회는 세그먼트별 반복 호출 필요.
