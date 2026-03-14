# @simplysm/core-browser

브라우저 환경 전용 유틸리티. DOM 확장, 파일 다운로드, IndexedDB 추상화를 제공한다.

## 설치

```bash
npm install @simplysm/core-browser
```

**의존성:** `@simplysm/core-common`, `tabbable`

## 주요 기능

### Element 확장 메서드

`import "@simplysm/core-browser"` (side-effect import) 시 `Element.prototype`에 추가된다.

```typescript
import "@simplysm/core-browser";

// 요소 검색
el.findAll<HTMLDivElement>(".item");          // 자식 요소 전체 검색
el.findFirst<HTMLInputElement>("input");      // 첫 번째 매칭 요소

// DOM 조작
el.prependChild(newChild);                   // 첫 번째 자식으로 삽입

// 탐색
el.getParents();                             // 모든 부모 요소 (가까운 순)
el.findFocusableParent();                    // 포커스 가능한 부모 찾기
el.findFirstFocusableChild();               // 포커스 가능한 첫 자식 찾기

// 상태 확인
el.isOffsetElement();                        // position: relative/absolute/fixed/sticky 여부
el.isVisible();                              // 가시성 확인 (clientRects, visibility, opacity)
```

#### getBounds -- 요소 크기/위치 일괄 조회

IntersectionObserver 기반으로 여러 요소의 뷰포트 기준 위치/크기를 비동기로 조회한다.

```typescript
import { getBounds } from "@simplysm/core-browser";
import type { ElementBounds } from "@simplysm/core-browser";

const bounds: ElementBounds[] = await getBounds([el1, el2, el3], 5000);
// 타임아웃 기본 5000ms, 초과 시 TimeoutError 발생

bounds[0]; // { target: Element, top: number, left: number, width: number, height: number }
```

**시그니처:**

```typescript
interface ElementBounds {
  target: Element;
  top: number;
  left: number;
  width: number;
  height: number;
}

function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>;
```

- 중복 요소는 자동 제거되며, 결과는 입력 순서대로 정렬된다.
- 빈 배열 입력 시 빈 배열을 즉시 반환한다.
- 타임아웃 초과 시 `TimeoutError` (`@simplysm/core-common`)를 throw한다.

#### 클립보드 -- copyElement / pasteToElement

copy/paste 이벤트 핸들러에서 사용한다. 대상 요소 내부의 첫 번째 `input`/`textarea`를 자동으로 찾아 처리한다.

```typescript
import { copyElement, pasteToElement } from "@simplysm/core-browser";

document.addEventListener("copy", (event) => {
  copyElement(event);   // input/textarea의 value를 클립보드에 복사
});

document.addEventListener("paste", (event) => {
  pasteToElement(event); // 클립보드 텍스트를 input/textarea에 붙여넣기
});
```

**시그니처:**

```typescript
function copyElement(event: ClipboardEvent): void;
function pasteToElement(event: ClipboardEvent): void;
```

- `pasteToElement`는 입력 요소의 전체 value를 교체하며, `input` 이벤트를 `bubbles: true`로 dispatch한다.
- 대상 요소가 `Element`가 아니거나 `clipboardData`가 없으면 무시한다.

### HTMLElement 확장 메서드

side-effect import 시 `HTMLElement.prototype`에 추가된다.

```typescript
el.repaint();                                // 강제 리페인트 (reflow 트리거)

// 상대 위치 계산 (transform 포함)
// parent: HTMLElement 또는 CSS 선택자 문자열
const offset = el.getRelativeOffset(parentEl);
const offset2 = el.getRelativeOffset(".container");
// { top: number, left: number } -- CSS top/left에 직접 사용 가능
// 뷰포트 좌표, 스크롤 위치, 보더, transform을 모두 반영

// 고정 영역을 고려한 스크롤
el.scrollIntoViewIfNeeded(
  { top: 100, left: 0 },  // 대상 위치 (offsetTop, offsetLeft)
  { top: 60, left: 0 },   // 오프셋 (고정 헤더 높이 등)
);
```

**시그니처:**

```typescript
interface HTMLElement {
  repaint(): void;
  getRelativeOffset(parent: HTMLElement | string): { top: number; left: number };
  scrollIntoViewIfNeeded(
    target: { top: number; left: number },
    offset?: { top: number; left: number },
  ): void;
}
```

- `getRelativeOffset`: 부모 요소를 찾을 수 없으면 `ArgumentError` (`@simplysm/core-common`)를 throw한다. 드롭다운/팝업을 `document.body`에 append한 뒤 위치를 잡을 때 유용하다.
- `scrollIntoViewIfNeeded`: 위쪽/왼쪽 방향 스크롤만 처리한다. 아래쪽/오른쪽은 브라우저 기본 포커스 스크롤에 위임한다.

### 파일 다운로드

```typescript
import { downloadBlob } from "@simplysm/core-browser";

downloadBlob(blob, "report.xlsx");
```

**시그니처:**

```typescript
function downloadBlob(blob: Blob, fileName: string): void;
```

내부적으로 `URL.createObjectURL`을 생성하고 1초 후 해제한다.

### 바이너리 다운로드 (진행률 지원)

URL에서 바이너리 데이터를 다운로드한다. Content-Length가 존재하면 미리 할당하여 메모리 효율적으로 처리하고, 없으면 chunked encoding 방식으로 수집 후 병합한다.

```typescript
import { fetchUrlBytes } from "@simplysm/core-browser";
import type { DownloadProgress } from "@simplysm/core-browser";

const data: Uint8Array = await fetchUrlBytes("/api/file", {
  onProgress: ({ receivedLength, contentLength }: DownloadProgress) => {
    // contentLength가 0이면 Content-Length 헤더가 없는 경우
  },
});
```

**시그니처:**

```typescript
interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}

function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>;
```

- HTTP 에러 응답 시 `Error("Download failed: {status} {statusText}")`를 throw한다.
- response body를 읽을 수 없는 경우 `Error("Response body is not readable")`를 throw한다.
- Content-Length가 없는 경우 `onProgress` 콜백의 `contentLength`는 `0`이며, 콜백이 호출되지 않는다.

### 파일 선택 다이얼로그

```typescript
import { openFileDialog } from "@simplysm/core-browser";

const files = await openFileDialog({
  accept: ".json",
  multiple: true,
});
// File[] | undefined (취소 시 undefined)
```

**시그니처:**

```typescript
function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>;
```

### IndexedDB 스토어

IndexedDB를 간단한 key-value 스토어로 추상화한다. `open()` 중복 호출 시 기존 연결을 재사용하며, 버전 변경/연결 종료 시 자동으로 상태를 정리한다.

```typescript
import { IndexedDbStore } from "@simplysm/core-browser";
import type { StoreConfig } from "@simplysm/core-browser";

const store = new IndexedDbStore("myApp", 1, [
  { name: "users", keyPath: "id" },
  { name: "settings", keyPath: "key" },
]);

await store.open();

// CRUD
await store.put("users", { id: "1", name: "Alice" });
const user = await store.get<User>("users", "1");
const all = await store.getAll<User>("users");
await store.delete("users", "1");

// 트랜잭션 스코프 (IDBObjectStore 직접 조작)
const result = await store.withStore("users", "readwrite", async (objStore) => {
  // IDBObjectStore API 직접 사용
  return someValue;
});

store.close();
```

**시그니처:**

```typescript
interface StoreConfig {
  name: string;
  keyPath: string;
}

class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[]);
  open(): Promise<IDBDatabase>;
  get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>;
  put(storeName: string, value: unknown): Promise<void>;
  delete(storeName: string, key: IDBValidKey): Promise<void>;
  getAll<TItem>(storeName: string): Promise<TItem[]>;
  withStore<TResult>(
    storeName: string,
    mode: IDBTransactionMode,
    fn: (store: IDBObjectStore) => Promise<TResult>,
  ): Promise<TResult>;
  close(): void;
}
```

- `open()`은 동시 호출 시 하나의 Promise만 생성하여 재사용한다.
- 다른 연결에서 버전이 변경되면(`onversionchange`) 자동으로 연결을 닫고 상태를 초기화한다.
- 다른 연결에 의해 blocked 상태가 되면 `Error("Database blocked by another connection")`를 throw한다.
- `withStore`에서 `fn` 실행 중 에러 발생 시 트랜잭션을 abort한 뒤 원래 에러를 다시 throw한다.

### IndexedDB 가상 파일시스템

IndexedDB 위에 계층적 파일/디렉토리 구조를 구현한다. `IndexedDbStore`를 내부 저장소로 사용한다.

```typescript
import { IndexedDbVirtualFs, IndexedDbStore } from "@simplysm/core-browser";
import type { VirtualFsEntry } from "@simplysm/core-browser";

const dbStore = new IndexedDbStore("vfs", 1, [{ name: "files", keyPath: "key" }]);
const vfs = new IndexedDbVirtualFs(dbStore, "files", "key");

// 디렉토리 생성 (중간 경로 자동 생성)
await vfs.ensureDir((p) => `root${p}`, "documents/reports");

// 파일 읽기/쓰기
await vfs.putEntry("root/hello.txt", "file", btoa("Hello"));
const entry = await vfs.getEntry("root/hello.txt");
// { kind: "file", dataBase64: "SGVsbG8=" } | undefined

// 목록 조회
const children = await vfs.listChildren("root/");
// [{ name: "documents", isDirectory: true }, { name: "hello.txt", isDirectory: false }]

// 삭제 (키 자체 + 하위 항목 모두 삭제)
const deleted: boolean = await vfs.deleteByPrefix("root/documents");
// true: 삭제된 항목이 있음, false: 해당 키 prefix에 항목 없음
```

**시그니처:**

```typescript
interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}

class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string);
  getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>;
  putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>;
  deleteByPrefix(keyPrefix: string): Promise<boolean>;
  listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>;
  ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>;
}
```

- `deleteByPrefix`는 정확히 일치하는 키와 `keyPrefix + "/"` 로 시작하는 하위 항목을 모두 삭제한다.
- `listChildren`은 직접 자식만 반환한다 (중첩된 하위 항목은 디렉토리로 표시).
- `ensureDir`은 경로의 각 세그먼트에 대해 이미 존재하는지 확인 후 없으면 생성한다.
