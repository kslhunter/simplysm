# @simplysm/sd-core-browser

브라우저 환경 전용 코어 모듈.
`Blob`/`Element`/`HTMLElement` 프로토타입에 DOM 조작 헬퍼를 주입(side-effect import)하고, `IntersectionObserver` 기반 측정 유틸을 제공.
`import "@simplysm/sd-core-browser"` 만 하면 전역 프로토타입 메서드가 추가됨 (`@simplysm/sd-core-common` 도 함께 로드).

## 사용 트리거 인덱스

- **Blob.download** — `Blob` 데이터를 파일로 다운로드 트리거할 때.
- **Element 탐색 확장** — `:scope` 한정 셀렉터로 자식/부모 요소를 찾거나 부모 체인을 수집할 때 (`findAll`/`findFirst`/`getParents`/`prependChild`).
- **Element 포커스 확장** — 포커스 가능한 요소를 판별, 탐색할 때 (`isFocusable`/`findFocusableAll`/`findFocusableFirst`/`findFocusableParent`).
- **Element 가시성/위치 확장** — 요소가 보이는지/offset 컨테이너인지 판별할 때 (`isVisible`/`isOffsetElement`).
- **Element 클립보드 확장** — 요소 내용을 클립보드에 복사/붙여넣기할 때 (`copyAsync`/`pasteAsync`).
- **HTMLElement 레이아웃 확장** — 강제 리페인트, 부모 기준 상대 offset 계산, 조건부 스크롤 시 (`repaint`/`getRelativeOffset`/`scrollIntoViewIfNeeded`).
- **HtmlElementUtils** — 여러 요소의 화면 bounds(top/left/width/height)를 한 번에 비동기 측정할 때.

## Blob 확장 (`Blob.ext`)

- `Blob.prototype.download(fileName: string): void` — `URL.createObjectURL`로 임시 링크를 만들고 `<a download>` 클릭을 트리거해 파일 저장 유도.
  - `fileName`: 저장될 파일명.
  - (ObjectURL 해제는 코드상 없음)

## Element 탐색 확장 (`Element.ext`)

`findAll`/`findFirst`는 셀렉터를 `,`로 분리해 각 항목에 `:scope ` 접두를 붙여 스코프 한정 후 `querySelectorAll`/`querySelector` 실행.

- `prependChild<T extends Element>(newChild: T): T` — `newChild`를 첫 자식 앞에 삽입(`insertBefore`)하고 그 노드를 반환.
- `findAll<T extends Element>(selector: string): T[]` — `:scope` 한정 셀렉터로 매칭되는 모든 요소를 배열로 반환. `selector`: CSS 셀렉터(콤마 다중 허용).
- `findFirst<T extends Element>(selector: string): T | undefined` — 위와 동일하나 첫 매칭 하나만, 없으면 `undefined`.
- `getParents(): HTMLElement[]` — `parentElement` 체인을 루트까지 따라가며 모든 조상을 가까운 순으로 수집.
- `findParent(selector: string | Element): HTMLElement | undefined` — **@deprecated, 브라우저 내장 `closest` 사용 권장.** 문자열이면 `matches`로, `Element`면 동일 노드(`===`)로 매칭되는 첫 조상 반환.

## Element 포커스 확장 (`Element.ext`)

포커스 가능 판정 셀렉터 집합:

- `a[href]:not([hidden])`, `button:not([disabled])`, `area[href]:not([hidden])`.
- `input:not([disabled]):not([hidden]):not(.sd-invalid-input)`.
- `select`/`textarea`(disabled, hidden 제외), `iframe`/`object`/`embed`(hidden 제외).
- `*[tabindex]:not([hidden])`, `*[contenteditable]:not([hidden])`.

- `isFocusable(): boolean` — 자기 자신이 위 포커스 셀렉터 집합에 `matches` 하면 `true`.
- `findFocusableAll(): TFocusableElement[]` — 하위(`:scope` 한정)에서 포커스 가능한 모든 요소 반환.
- `findFocusableFirst(): TFocusableElement | undefined` — 하위에서 첫 포커스 가능 요소, 없으면 `undefined`.
- `findFocusableParent(): TFocusableElement | undefined` — 부모 체인을 올라가며 첫 포커스 가능 조상, 없으면 `undefined`.
- `TFocusableElement = Element & HTMLOrSVGElement` — 위 메서드들의 반환 요소 타입(`focus()` 호출 가능 보장용).

## Element 가시성/위치 확장 (`Element.ext`)

- `isOffsetElement(): boolean` — `getComputedStyle(this).position`이 `relative`/`absolute`/`fixed`/`sticky` 중 하나면 `true`. offset 부모 컨테이너 여부 판별용.
- `isVisible(): boolean` — `getClientRects().length > 0` 이고 `visibility !== "hidden"` 이며 `opacity !== "0"` 일 때 `true`. (display:none, 투명, 미렌더 요소를 false 처리)

## Element 클립보드 확장 (`Element.ext`)

둘 다 `navigator`에 `clipboard`가 없으면 즉시 반환(no-op). 내부적으로 `findFirst("input:not(.sd-invalid-input)")`로 첫 유효 input 탐색.

- `copyAsync(): Promise<void>` — 하위 첫 유효 input이 있으면 그 `value`를, 없으면 요소의 `innerHTML`을 클립보드에 `writeText`.
- `pasteAsync(): Promise<void>` — 클립보드 텍스트를 `readText`로 읽어 하위 첫 유효 input의 `value`에 대입(입력 요소 없으면 효과 없음).

## HTMLElement 레이아웃 확장 (`HtmlElement.ext`)

- `repaint(): void` — `this.offsetHeight`를 읽어 강제 리플로우/리페인트를 유발(레이아웃 갱신 강제용).
- `getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }` — 요소의 `parent` 기준 상대 위치 계산.
  - `parent`가 문자열이면 `closest(parent)`로 조상 탐색, 결과가 `HTMLElement`가 아니면 `Error("Parent element not found")` throw.
  - `getBoundingClientRect` 차이에 스크롤(`scrollTop`/`scrollLeft`), 중간 조상들의 `borderTopWidth`/`borderLeftWidth`, transform `DOMMatrix` 보정을 반영.
- `scrollIntoViewIfNeeded(target: { top: number; left: number }, offset?: { top: number; left: number }): void`
  - `target` 위치가 현재 스크롤+`offset` 안쪽보다 위/왼쪽에 있을 때만 `scrollTop`/`scrollLeft`를 `target - offset`으로 조정.
  - `offset` 기본값 `{ top: 0, left: 0 }`.

## HtmlElementUtils

- `static getBoundsAsync(els: HTMLElement[]): Promise<{ target: HTMLElement; top: number; left: number; width: number; height: number }[]>`
  - `IntersectionObserver`로 전달된 요소들을 한 번 관찰해 첫 콜백에서 `disconnect` 후 각 요소의 `boundingClientRect`(top/left/width/height)와 `target`을 묶어 resolve.
  - 레이아웃 thrashing 없이 다수 요소 bounds를 비동기 일괄 측정할 때 사용.

## 호환성

- `Element.prototype.matches`가 `undefined`이면 `msMatchesSelector`로 폴백 설정(구형 브라우저 대응). import 시점에 1회 적용.
