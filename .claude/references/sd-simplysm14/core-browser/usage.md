# @simplysm/core-browser

브라우저 전용 유틸리티 패키지. DOM 프로토타입 확장, 파일 다운로드/업로드, HTTP fetch, IndexedDB 추상화를 제공한다.

## Installation

```bash
npm install @simplysm/core-browser
```

## API Overview

### Extensions

사이드 이펙트 모듈로, 패키지를 임포트하면 자동으로 `Element`와 `HTMLElement` 프로토타입에 메서드가 추가된다.

| API | Type | Description |
|-----|------|-------------|
| `ElementBounds` | interface | 요소 경계 정보 (target, top, left, width, height) |
| `copyElement` | function | copy 이벤트 핸들러에서 요소 내 input/textarea 값을 클립보드에 복사 |
| `pasteToElement` | function | paste 이벤트 핸들러에서 클립보드 텍스트를 요소 내 input/textarea에 붙여넣기 |
| `getBounds` | function | IntersectionObserver로 여러 요소의 경계 정보를 비동기 조회 |
| `Element.prototype.findAll` | prototype extension | 선택자와 일치하는 모든 하위 요소 검색 |
| `Element.prototype.findFirst` | prototype extension | 선택자와 일치하는 첫 번째 요소 검색 |
| `Element.prototype.prependChild` | prototype extension | 요소를 첫 번째 자식으로 삽입 |
| `Element.prototype.getParents` | prototype extension | 모든 부모 요소를 가까운 순서로 조회 |
| `Element.prototype.findTabbableParent` | prototype extension | 첫 번째 탭 이동 가능한 부모 요소 검색 (tabbable 사용) |
| `Element.prototype.findFirstTabbableChild` | prototype extension | 첫 번째 탭 이동 가능한 자식 요소 검색 (tabbable 사용) |
| `Element.prototype.isOffsetElement` | prototype extension | position이 relative/absolute/fixed/sticky인지 확인 |
| `Element.prototype.isVisible` | prototype extension | 요소가 화면에 보이는지 확인 (clientRects, visibility, opacity) |
| `HTMLElement.prototype.repaint` | prototype extension | 강제 리페인트 트리거 (offsetHeight 접근) |
| `HTMLElement.prototype.getRelativeOffset` | prototype extension | 부모 요소 기준 상대 위치 계산 (CSS top/left 용) |
| `HTMLElement.prototype.scrollIntoViewIfNeeded` | prototype extension | offset 영역에 가려진 경우 대상이 보이도록 스크롤 |

#### `ElementBounds`

```typescript
export interface ElementBounds {
  target: Element;
  top: number;
  left: number;
  width: number;
  height: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `Element` | 측정 대상 요소 |
| `top` | `number` | 뷰포트 기준 상단 위치 |
| `left` | `number` | 뷰포트 기준 좌측 위치 |
| `width` | `number` | 요소 너비 |
| `height` | `number` | 요소 높이 |

#### `copyElement`

```typescript
export function copyElement(event: ClipboardEvent): void
```

copy 이벤트 핸들러와 함께 사용한다. 이벤트 타겟 요소 내의 첫 번째 `input` 또는 `textarea`를 찾아 그 값을 클립보드에 설정한다. 해당 요소가 없으면 아무 동작도 하지 않는다.

#### `pasteToElement`

```typescript
export function pasteToElement(event: ClipboardEvent): void
```

paste 이벤트 핸들러와 함께 사용한다. 이벤트 타겟 요소 내의 첫 번째 `input` 또는 `textarea`를 찾아 값 전체를 클립보드 텍스트로 교체한다. 커서 위치나 선택 영역은 고려하지 않는다. `input` 이벤트를 dispatch한다.

#### `getBounds`

```typescript
export async function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>
```

IntersectionObserver를 사용하여 여러 요소의 경계 정보를 비동기로 조회한다. 중복 요소는 자동 제거되며, 입력 순서대로 결과가 정렬된다. `timeout` 기본값은 5000ms이며, 시간 내에 응답이 없으면 `TimeoutError`를 던진다.

#### Element Prototype Extensions

`Element.prototype`에 추가되는 메서드들:

```typescript
// 선택자와 일치하는 모든 하위 요소 검색 (빈 선택자 -> 빈 배열)
element.findAll<TEl extends Element = Element>(selector: string): TEl[]

// 선택자와 일치하는 첫 번째 요소 (빈 선택자 -> undefined)
element.findFirst<TEl extends Element = Element>(selector: string): TEl | undefined

// 요소를 첫 번째 자식으로 삽입
element.prependChild<TEl extends Element>(child: TEl): TEl

// 모든 부모 요소 배열 (가까운 순서)
element.getParents(): Element[]

// 첫 번째 탭 이동 가능한 부모 요소 (tabbable 라이브러리 사용)
element.findTabbableParent(): HTMLElement | undefined

// 첫 번째 탭 이동 가능한 자식 요소 (tabbable 라이브러리 사용)
element.findFirstTabbableChild(): HTMLElement | undefined

// position이 relative/absolute/fixed/sticky인지 확인
element.isOffsetElement(): boolean

// 화면에 보이는지 확인 (clientRects, visibility, opacity)
element.isVisible(): boolean
```

#### HTMLElement Prototype Extensions

`HTMLElement.prototype`에 추가되는 메서드들:

```typescript
// 강제 리페인트 (offsetHeight 접근으로 reflow 트리거)
htmlElement.repaint(): void

// 부모 요소 기준 상대 위치 계산 (CSS top/left에 사용 가능)
// parent: HTMLElement 또는 CSS 선택자 문자열
// border 두께, CSS transform 변환 포함
// 부모를 찾을 수 없으면 ArgumentError throw
htmlElement.getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }

// offset 영역에 가려진 경우 스크롤 조정
// target: 컨테이너 내 대상 위치 (offsetTop, offsetLeft)
// offset: 가려지면 안 되는 영역 크기 (기본값 { top: 0, left: 0 })
// 상단/좌측 방향만 처리, 하단/우측은 브라우저 기본 동작에 의존
htmlElement.scrollIntoViewIfNeeded(
  target: { top: number; left: number },
  offset?: { top: number; left: number }
): void
```

### Utils

| API | Type | Description |
|-----|------|-------------|
| `downloadBlob` | function | Blob을 파일로 다운로드 (링크 클릭 방식) |
| `DownloadProgress` | interface | 다운로드 진행 정보 (receivedLength, contentLength) |
| `fetchUrlBytes` | function | URL에서 Uint8Array 다운로드 (진행 콜백 지원) |
| `openFileDialog` | function | 파일 선택 대화상자를 프로그래밍 방식으로 열기 |
| `StoreConfig` | interface | IndexedDbStore 스토어 설정 (name, keyPath) |
| `IndexedDbStore` | class | IndexedDB를 Promise 기반으로 래핑한 저수준 CRUD 클래스 |
| `VirtualFsEntry` | interface | 가상 파일시스템 엔트리 (kind, dataBase64) |
| `IndexedDbVirtualFs` | class | IndexedDB 기반 경로 기반 가상 파일시스템 |

#### `downloadBlob`

```typescript
export function downloadBlob(blob: Blob, fileName: string): void
```

Blob을 파일로 다운로드한다. `<a>` 태그를 생성하여 클릭하는 방식이다. Object URL은 1초 후 자동 해제된다.

#### `DownloadProgress`

```typescript
export interface DownloadProgress {
  receivedLength: number;
  contentLength: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `receivedLength` | `number` | 현재까지 수신한 바이트 수 |
| `contentLength` | `number` | 전체 콘텐츠 길이 (Content-Length 헤더 값) |

#### `fetchUrlBytes`

```typescript
export async function fetchUrlBytes(
  url: string,
  options?: { onProgress?: (progress: DownloadProgress) => void },
): Promise<Uint8Array>
```

URL에서 바이너리 데이터를 `Uint8Array`로 다운로드한다. `Content-Length` 헤더가 있으면 사전 할당으로 메모리 효율을 높이고, 없으면 청크 수집 후 `bytes.concat`으로 병합한다. 진행 콜백은 `options.onProgress`로 수신한다. 응답이 실패하면 Error를 던진다.

#### `openFileDialog`

```typescript
export function openFileDialog(options?: {
  accept?: string;
  multiple?: boolean;
}): Promise<File[] | undefined>
```

프로그래밍 방식으로 파일 선택 대화상자를 연다. `accept`로 파일 형식 필터, `multiple`로 다중 선택 여부를 지정한다. 파일 선택 시 `File[]` 반환, 취소 시 `undefined` 반환.

#### `StoreConfig`

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

#### `IndexedDbStore`

```typescript
export class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[])

  open(): Promise<IDBDatabase>
  withStore<TResult>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<TResult>): Promise<TResult>
  get<TValue>(storeName: string, key: IDBValidKey): Promise<TValue | undefined>
  put(storeName: string, value: unknown): Promise<void>
  delete(storeName: string, key: IDBValidKey): Promise<void>
  getAll<TItem>(storeName: string): Promise<TItem[]>
  close(): void
}
```

IndexedDB를 Promise 기반으로 래핑한 저수준 클래스. 생성자에서 DB 이름, 버전, 스토어 설정을 받는다.

| Method | Description |
|--------|-------------|
| `open()` | DB 연결을 열고 `IDBDatabase`를 반환. 중복 호출에 안전 (이미 열려 있으면 기존 인스턴스 반환) |
| `withStore(storeName, mode, fn)` | 지정 스토어에서 트랜잭션을 열고 `fn`을 실행. fn이 에러를 던지면 트랜잭션을 abort한다 |
| `get(storeName, key)` | 키로 단일 항목 조회. 없으면 `undefined` |
| `put(storeName, value)` | 항목 추가/갱신 (keyPath에 해당하는 필드가 value에 포함되어야 함) |
| `delete(storeName, key)` | 키로 항목 삭제 |
| `getAll(storeName)` | 스토어의 모든 항목 조회 |
| `close()` | DB 연결 닫기 |

#### `VirtualFsEntry`

```typescript
export interface VirtualFsEntry {
  kind: "file" | "dir";
  dataBase64?: string;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `kind` | `"file" \| "dir"` | 엔트리 종류 (파일 또는 디렉토리) |
| `dataBase64` | `string \| undefined` | 파일 데이터 (Base64 인코딩, 디렉토리인 경우 없음) |

#### `IndexedDbVirtualFs`

```typescript
export class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string)

  getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>
  putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>
  deleteByPrefix(keyPrefix: string): Promise<boolean>
  listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>
  ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>
}
```

`IndexedDbStore` 위에 경로 기반 가상 파일시스템을 구현하는 클래스. 키는 `/path/to/file` 형태의 문자열.

| Method | Description |
|--------|-------------|
| `getEntry(fullKey)` | 경로에 해당하는 엔트리 조회. 없으면 `undefined` |
| `putEntry(fullKey, kind, dataBase64?)` | 엔트리 추가/갱신. `kind`는 `"file"` 또는 `"dir"` |
| `deleteByPrefix(keyPrefix)` | 접두사와 일치하는 모든 엔트리 삭제. 삭제된 항목이 있으면 `true` |
| `listChildren(prefix)` | 접두사 바로 아래 자식 목록 반환. 이름과 디렉토리 여부 포함 |
| `ensureDir(fullKeyBuilder, dirPath)` | 경로의 모든 중간 디렉토리를 재귀적으로 생성. 이미 있으면 건너뜀 |

## Usage Examples

### Blob 파일 다운로드

```typescript
import { downloadBlob } from "@simplysm/core-browser";

const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]);
const blob = new Blob([data], { type: "application/octet-stream" });
downloadBlob(blob, "output.bin");
```

### IndexedDB CRUD

```typescript
import { IndexedDbStore } from "@simplysm/core-browser";

const store = new IndexedDbStore("myDb", 1, [{ name: "items", keyPath: "id" }]);

await store.put("items", { id: "key1", value: "hello" });
const item = await store.get<{ id: string; value: string }>("items", "key1");
const all = await store.getAll<{ id: string; value: string }>("items");
await store.delete("items", "key1");
store.close();
```

### DOM 프로토타입 확장 사용

```typescript
import "@simplysm/core-browser";

const container = document.querySelector(".container")!;
const buttons = container.findAll<HTMLButtonElement>("button");
const firstInput = container.findFirst<HTMLInputElement>("input[type=text]");
const parents = container.getParents();
const focusable = container.findFirstTabbableChild();
```
