# @simplysm/core-browser

브라우저 전용 유틸리티. DOM `Element`/`HTMLElement` 프로토타입 확장(import 시 사이드 이펙트로 등록)과 클립보드·다운로드·파일선택·fetch·IndexedDB 헬퍼를 제공.

## 사용 트리거 인덱스

- **Element 확장 메서드** — DOM 요소 탐색·삽입·가시성/탭이동 판정을 프로토타입 메서드로 호출할 때. 패키지를 import 하면 자동 등록됨. (아래 인라인)
- **HTMLElement 확장 메서드** — 리페인트 강제, 부모 기준 상대 좌표 계산, offset 가림 보정 스크롤이 필요할 때. (아래 인라인)
- **clipboard / bounds 정적 함수** (`copyElement`, `pasteToElement`, `getBounds`) — copy/paste 이벤트 핸들러를 붙이거나 여러 요소의 화면 경계를 한 번에 측정할 때. (아래 인라인)
- **다운로드·파일선택·fetch** (`downloadBlob`, `openFileDialog`, `fetchUrlBytes`) — Blob 저장, 파일 선택 다이얼로그, 진행률 포함 바이너리 다운로드가 필요할 때. (아래 인라인)
- **IndexedDB 저장소/가상 파일시스템** (`IndexedDbStore`, `IndexedDbVirtualFs`) — 브라우저 IndexedDB 에 KV 저장하거나 경로 기반 가상 파일트리를 다룰 때. 자세히: [indexed-db.md](./indexed-db.md)

## Element 확장 메서드

`import "@simplysm/core-browser"`(또는 패키지 내 어떤 심볼이든 import) 시 `index.ts` 가 `import "./extensions/..."` 로 `Element.prototype` 에 등록함. 별도 초기화 호출 불필요.

- `findAll<TEl>(selector: string): TEl[]` — 선택자 일치 하위 요소를 배열로 반환. 선택자를 trim 한 결과가 빈 문자열이면 `[]`. `querySelectorAll` 을 NodeList 대신 배열로 받고 빈 선택자 예외를 회피할 때.
- `findFirst<TEl>(selector: string): TEl | undefined` — 첫 일치 하위 요소 또는 `undefined`. 빈 선택자면 `undefined`, 미일치도 `undefined`. `querySelector` 의 `null` 을 `undefined` 로 정규화한 형태.
- `prependChild<TEl>(child: TEl): TEl` — 자식을 첫 번째 위치(`insertBefore(child, firstElementChild)`)로 삽입하고 그 요소 반환. 맨 앞에 끼울 때.
- `getParents(): Element[]` — 모든 조상 요소를 가까운 것부터 먼 순서로 배열 반환. 조상 체인 순회·특정 조상 포함 판정에.
- `findTabbableParent(): HTMLElement | undefined` — `tabbable` 기준 첫 탭 이동 가능 조상. 포커스 위임 대상을 위로 탐색할 때.
- `findFirstTabbableChild(): HTMLElement | undefined` — TreeWalker 로 순회한 첫 탭 이동 가능 하위 요소. 컨테이너 진입 시 자동 포커스 대상 찾을 때.
- `isOffsetElement(): boolean` — `position` 이 relative/absolute/fixed/sticky 중 하나면 true. offset parent(절대배치 기준) 역할 여부 판정에.
- `isVisible(): boolean` — `getClientRects().length > 0` + `visibility !== "hidden"` + `opacity !== "0"` 를 모두 만족하면 true. 화면 표시 여부 판정에(display:none 은 clientRects 가 비어 false).

```ts
import "@simplysm/core-browser";
const rows = containerEl.findAll<HTMLElement>("tr");
const first = containerEl.findFirstTabbableChild();
```

## HTMLElement 확장 메서드

`HTMLElement.prototype` 에 등록되는 메서드. 위와 동일하게 import 만으로 활성화.

- `repaint(): void` — `offsetHeight` 접근으로 강제 동기 레이아웃(reflow)을 유발해 즉시 리페인트. 스타일 변경 직후 반영을 강제할 때.
- `getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }` — 부모 기준 CSS top/left 좌표 계산. 뷰포트 위치·부모 스크롤·중간 요소 border·CSS transform 까지 반영. 드롭다운/팝업 위치 지정에. 부모를 못 찾으면 `ArgumentError` throw.
  - parent: `HTMLElement | string` — 기준 부모. 문자열이면 `this.closest(parent)` 로 조상 탐색, 요소면 직접 사용. `document.body` 나 `".container"` 식으로 지정.
- `scrollIntoViewIfNeeded(target, offset?): void` — 대상이 스크롤 영역의 상단/좌측 경계를 벗어났을 때만 스크롤하여 보이게 함. 하단/우측은 처리하지 않고 브라우저 기본 포커스 스크롤에 위임. 고정 헤더/컬럼 테이블의 포커스 처리에.
  - target: `{ top: number; left: number }` — 컨테이너 내 대상 위치(offsetTop/offsetLeft).
  - offset: `{ top: number; left: number }` — 가려지면 안 되는 영역 크기(고정 헤더 높이·고정 컬럼 너비). 기본 `{ top: 0, left: 0 }`.

```ts
const { top, left } = popupEl.getRelativeOffset(".container");
scrollEl.scrollIntoViewIfNeeded({ top: cellTop, left: cellLeft }, { top: headerH, left: fixedW });
```

## clipboard / bounds 정적 함수

- `copyElement(event: ClipboardEvent): void` — copy 이벤트 핸들러용. 이벤트 타겟 내 첫 `input/textarea` 의 `value` 를 클립보드 `text/plain` 으로 기록하고 `preventDefault`. clipboardData 없거나 타겟이 Element 아니거나 input 없으면 무동작.
  - event: `ClipboardEvent` — copy 이벤트 객체. `el.addEventListener("copy", copyElement)` 로 등록.
- `pasteToElement(event: ClipboardEvent): void` — paste 이벤트 핸들러용. 타겟 내 첫 `input/textarea` 의 전체 `value` 를 클립보드 텍스트로 교체하고 `input` 이벤트 dispatch 후 `preventDefault`. 커서 위치·선택 영역은 무시(전체 치환).
  - event: `ClipboardEvent` — paste 이벤트 객체.
- `getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>` — `IntersectionObserver` 로 여러 요소의 뷰포트 기준 경계를 한 번에 측정. 중복 제거 후 입력 순서대로 정렬해 반환. 빈 배열이면 즉시 `[]`. 모든 요소 관측 완료 시 resolve, 제한시간 초과 시 `TimeoutError` throw.
  - els: `Element[]` — 측정 대상. 중복은 제거되고 입력 순서로 정렬됨.
  - timeout: `number` — 제한시간(ms). 기본 `5000`. 초과 시 `TimeoutError`.
- `ElementBounds`(반환 타입) — `target: Element`(측정 요소), `top`/`left`(뷰포트 기준 위치), `width`/`height`(요소 크기). 모두 `boundingClientRect` 값.

```ts
inputEl.addEventListener("copy", copyElement);
const bounds = await getBounds([elA, elB], 3000);
```

## 다운로드·파일선택·fetch

- `downloadBlob(blob: Blob, fileName: string): void` — Blob 을 objectURL 로 만들어 동적 `a[download]` 클릭으로 저장. objectURL 은 1초 뒤 revoke. fileName 은 `sanitize-filename` 으로 금지문자·예약어 제거 후 `[`,`]` 도 제거하며, 결과가 비면 `"download"` 로 대체.
  - blob: `Blob` — 저장할 데이터.
  - fileName: `string` — 저장 파일명. 파일시스템 금지 문자·예약어는 자동 정리됨.
- `openFileDialog(options?): Promise<File[] | undefined>` — 동적 `input[type=file]` 을 클릭해 파일 선택 다이얼로그 표시. 선택하면 `File[]`, 취소(cancel 이벤트)하거나 빈 선택이면 `undefined`.
  - options.accept: `string` — 허용 MIME/확장자 필터(input `accept`). 미지정 시 제한 없음. 예: `".png,.jpg"`.
  - options.multiple: `boolean` — 다중 선택 허용. 기본 `false`. 여러 파일 받을 때 `true`.
- `fetchUrlBytes(url, options?): Promise<Uint8Array>` — URL 바이너리를 스트림으로 다운로드. `response.ok` 아니거나 본문 없으면 Error throw. Content-Length 가 있으면 그 크기로 사전 할당하며 수신량이 그보다 초과/미달이면 Error, 없으면 청크를 모아 `bytes.concat` 으로 병합(chunked encoding).
  - url: `string` — 다운로드 대상 URL.
  - options.onProgress: `(progress: DownloadProgress) => void` — 청크 수신마다 호출(Content-Length 가 있는 경로에서만).
- `DownloadProgress`(콜백 인자 타입) — `receivedLength`(누적 수신 바이트), `contentLength`(전체 바이트, Content-Length).

```ts
downloadBlob(new Blob([buf]), "보고서.xlsx");
const files = await openFileDialog({ accept: ".csv", multiple: true });
const data = await fetchUrlBytes("/api/file", {
  onProgress: (p) => setPct(p.receivedLength / p.contentLength),
});
```
