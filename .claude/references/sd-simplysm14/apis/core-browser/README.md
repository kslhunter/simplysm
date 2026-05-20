# @simplysm/core-browser

브라우저 전용 보강 — `Element`/`HTMLElement` 프로토타입 확장(import 사이드 이펙트) + DOM/파일/네트워크/IndexedDB 헬퍼.

> 이 패키지를 import 만 해도 `Element`/`HTMLElement` 프로토타입이 확장된다. SSR 환경에서는 import 자체를 피한다.

## 사용 트리거 인덱스

DOM 탐색/가시성 — `Element` 확장:

- **`findAll`** — `el` 하위에서 선택자 일치 요소 전부 배열로 받을 때.
- **`findFirst`** — `el` 하위에서 선택자 일치 첫 요소만 받을 때 (`querySelector` 의 `null` 대신 `undefined`).
- **`prependChild`** — 자식 목록의 맨 앞으로 삽입할 때.
- **`getParents`** — 가까운 부모부터 위로 거슬러 올라가는 조상 배열이 필요할 때.
- **`isOffsetElement`** — 어떤 요소가 자식 absolute 의 기준이 되는지(`position: relative/absolute/fixed/sticky`) 판정할 때.
- **`isVisible`** — 화면에 실제로 보이는지(클라이언트 영역 + `visibility` + `opacity`) 판정할 때.

포커스/탭 이동 — `Element` 확장:

- **`findTabbableParent`** — 현재 요소를 감싸는 가장 가까운 tabbable 부모를 찾을 때 (모달·툴팁의 포커스 트랩 호스트 추적).
- **`findFirstTabbableChild`** — 컨테이너에 진입했을 때 처음 포커스할 자식을 찾을 때.

레이아웃/스크롤 — `HTMLElement` 확장:

- **`repaint`** — 스타일 변경 후 즉시 동기 reflow 가 필요할 때.
- **`getRelativeOffset`** — 드롭다운/팝업을 부모 기준 absolute 좌표로 띄울 때 (스크롤·border·transform 보정 포함).
- **`scrollIntoViewIfNeeded`** — 고정 헤더/컬럼에 가려진 셀을 위/왼쪽으로만 보정 스크롤할 때.

클립보드/측정 헬퍼:

- **`copyElement`** — `<el @copy>` 이벤트 핸들러로 내부 첫 input/textarea 값을 클립보드로 보낼 때.
- **`pasteToElement`** — `<el @paste>` 이벤트 핸들러로 클립보드 값을 내부 첫 input/textarea 에 전체 교체할 때.
- **`getBounds`** / **`ElementBounds`** — 다수 요소의 뷰포트 경계를 `IntersectionObserver` 로 한 번에 측정할 때 (입력 순서 유지·타임아웃 보장).

파일 다이얼로그/다운로드:

- **`openFileDialog`** — 사용자에게 파일 선택 UI 를 띄워 `File[]` 을 받을 때 (취소·빈 선택은 `undefined`).
- **`downloadBlob`** — 메모리 상의 `Blob` 을 사용자 다운로드로 흘려보낼 때 (파일명 sanitize).

진행률 fetch:

- **`fetchUrlBytes`** / **`DownloadProgress`** — 큰 바이너리를 `Uint8Array` 로 받으며 진행률 콜백을 받을 때.

IndexedDB:

- **`IndexedDbStore`** / **`StoreConfig`** — 브라우저 영속 키/값 저장소가 필요할 때 (트랜잭션·재진입 안전 `open`).
- **`IndexedDbVirtualFs`** / **`VirtualFsEntry`** — 위 저장소 위에 경로(`/a/b/c`) 기반 파일/디렉토리 트리를 올릴 때.

## DOM 탐색/가시성 — `Element` 확장

```ts
el.findAll<T extends Element = Element>(selector: string): T[]            // 빈 선택자 → []
el.findFirst<T extends Element = Element>(selector: string): T | undefined // 빈 선택자 → undefined
el.prependChild<T extends Element>(child: T): T                            // 첫 자식으로 삽입
el.getParents(): Element[]                                                  // 가까운 순서
el.isOffsetElement(): boolean                                               // position: relative/absolute/fixed/sticky
el.isVisible(): boolean                                                     // clientRects 존재 + visibility != hidden + opacity != "0"
```

## 포커스/탭 이동 — `Element` 확장

```ts
el.findTabbableParent(): HTMLElement | undefined       // tabbable 라이브러리 사용
el.findFirstTabbableChild(): HTMLElement | undefined   // TreeWalker로 첫 매치
```

## 레이아웃/스크롤 — `HTMLElement` 확장

```ts
el.repaint(): void                                              // offsetHeight 접근으로 강제 reflow
el.getRelativeOffset(parent: HTMLElement | string): { top; left } // CSS top/left 즉시 사용 가능. transform/border/스크롤 보정. 못 찾으면 ArgumentError
el.scrollIntoViewIfNeeded(target: { top; left }, offset?): void // 상단/좌측 가림만 보정. 하단/우측은 브라우저 기본
```

`getRelativeOffset` 은 드롭다운/팝업의 absolute 위치 지정 표준 경로. `parent` 는 가장 가까운 offset parent 또는 selector.

## 클립보드/측정 헬퍼

```ts
function copyElement(event: ClipboardEvent): void       // 대상 내 첫 input/textarea.value → clipboard
function pasteToElement(event: ClipboardEvent): void    // clipboard → 첫 input/textarea.value 교체 + input 이벤트 dispatch
function getBounds(els: Element[], timeout = 5000): Promise<ElementBounds[]> // IntersectionObserver 기반. 입력 순서 유지. timeout 초과 시 TimeoutError

interface ElementBounds { target: Element; top: number; left: number; width: number; height: number; }
```

`copyElement`/`pasteToElement` 는 `<element @copy=... @paste=...>` 이벤트 핸들러로 직결. 커서/선택 영역은 무시하고 전체 값 교체.

## 파일 다이얼로그/다운로드

```ts
function openFileDialog(options?: { accept?: string; multiple?: boolean }): Promise<File[] | undefined>
//   취소 시 undefined, 빈 선택 시 undefined.
function downloadBlob(blob: Blob, fileName: string): void
//   파일명: sanitize-filename + 대괄호 제거. 빈 결과는 "download". ObjectURL 1초 후 해제.
```

## 진행률 fetch

```ts
interface DownloadProgress { receivedLength: number; contentLength: number; }
function fetchUrlBytes(url: string, options?: { onProgress?: (p: DownloadProgress) => void }): Promise<Uint8Array>
```

`Content-Length` 가 있으면 사전 할당(메모리 효율) + 초과/부족 검출, 없으면 청크 수집 후 `bytes.concat`. HTTP 오류·본문 없음·길이 불일치는 모두 throw.

## IndexedDB 저장소 — `IndexedDbStore`

```ts
interface StoreConfig { name: string; keyPath: string; }

class IndexedDbStore {
  constructor(dbName: string, dbVersion: number, storeConfigs: StoreConfig[]);
  open(): Promise<IDBDatabase>;                                            // versionchange/close 시 자동 무효화
  withStore<R>(name, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<R>): Promise<R>; // fn throw 시 tx.abort
  get<T>(name, key: IDBValidKey): Promise<T | undefined>;
  put(name, value): Promise<void>;
  delete(name, key: IDBValidKey): Promise<void>;
  getAll<T>(name): Promise<T[]>;
  close(): void;
}
```

`open()` 은 중복 호출 안전(병행 호출 단일화). `withStore` 의 `fn` 내부 에러는 트랜잭션 abort 후 원본 에러로 reject.

## IndexedDB 가상 파일시스템 — `IndexedDbVirtualFs`

`IndexedDbStore` 위에 경로 키(`/a/b/c`) 기반 파일/디렉토리 모델. 데이터는 base64 문자열로 저장.

```ts
interface VirtualFsEntry { kind: "file" | "dir"; dataBase64?: string; }

class IndexedDbVirtualFs {
  constructor(db: IndexedDbStore, storeName: string, keyField: string);
  getEntry(fullKey: string): Promise<VirtualFsEntry | undefined>;
  putEntry(fullKey: string, kind: "file" | "dir", dataBase64?: string): Promise<void>;
  deleteByPrefix(keyPrefix: string): Promise<boolean>;                  // 자기 자신 + "/" 하위 재귀 삭제
  listChildren(prefix: string): Promise<{ name: string; isDirectory: boolean }[]>; // 직속 자식만, 중간 경로도 dir 로 노출
  ensureDir(fullKeyBuilder: (path: string) => string, dirPath: string): Promise<void>; // 중간 디렉토리 모두 생성
}
```

`fullKey`/`keyField`/`fullKeyBuilder` 분리로 멀티 테넌트(예: 사용자별 prefix) 키 스킴을 호출 측에서 결정.
