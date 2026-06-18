# @simplysm/core-browser — DOM 요소 확장

DOM 요소를 다룰 때 함께 읽히는 묶음. `Element.prototype`/`HTMLElement.prototype` 에 등록되는 확장 메서드와, 이벤트 핸들러·다중 요소용 정적 함수(`copyElement`/`pasteToElement`/`getBounds`)로 구성. 패키지를 import 하면 브라우저 환경에서 프로토타입 메서드가 자동 등록되므로 별도 초기화는 필요 없다(node/SSR 에선 `typeof Element` 가드로 등록을 건너뜀).

## Element 확장 메서드

`Element.prototype` 에 등록. import 만으로 활성화.

- `findAll<TEl extends Element = Element>(selector: string): TEl[]` — 선택자 일치 하위 요소를 `querySelectorAll` 결과의 배열로 반환. 선택자를 `trim` 한 결과가 빈 문자열이면 `[]`. NodeList 대신 배열로 받고 빈/공백 선택자 예외를 회피할 때.
- `findFirst<TEl extends Element = Element>(selector: string): TEl | undefined` — 첫 일치 하위 요소 또는 `undefined`. 빈/공백 선택자도 `undefined`, 미일치도 `undefined`. `querySelector` 의 `null` 을 `undefined` 로 정규화한 형태.
- `prependChild<TEl extends Element>(child: TEl): TEl` — 자식을 첫 번째 위치(`insertBefore(child, firstElementChild)`)에 삽입하고 그 요소를 반환. 맨 앞에 끼워 넣을 때.
- `getParents(): Element[]` — `parentNode` 를 타고 올라가며 모든 조상 Element 를 가까운 것부터 먼 순서로 배열 반환. 조상 체인 순회·특정 조상 포함 판정에.
- `findTabbableParent(): HTMLElement | undefined` — `parentElement` 를 위로 타며 `tabbable` 라이브러리 기준 첫 탭 이동 가능 조상을 반환. 없으면 `undefined`. 포커스 위임 대상을 위로 탐색할 때.
- `findFirstTabbableChild(): HTMLElement | undefined` — `TreeWalker(SHOW_ELEMENT)` 로 깊이 우선 순회한 첫 탭 이동 가능(`isTabbable`) 하위 요소. 없으면 `undefined`. 컨테이너 진입 시 자동 포커스 대상을 찾을 때.
- `isOffsetElement(): boolean` — `getComputedStyle().position` 이 `relative`/`absolute`/`fixed`/`sticky` 중 하나면 `true`, 아니면(`static` 등) `false`. 절대배치 기준(offset parent) 역할 여부 판정에.
- `isVisible(): boolean` — `getClientRects().length > 0` 이고 `visibility !== "hidden"` 이고 `opacity !== "0"` 를 모두 만족하면 `true`. 화면 표시 여부 판정에(`display:none` 은 clientRects 가 비어 `false`).

```ts
import "@simplysm/core-browser";
const rows = containerEl.findAll<HTMLElement>("tr");
const first = containerEl.findFirstTabbableChild();
```

## HTMLElement 확장 메서드

`HTMLElement.prototype` 에 등록. 위와 동일하게 import 만으로 활성화.

- `repaint(): void` — `offsetHeight` 에 접근해 강제 동기 레이아웃(reflow)을 유발, 누적된 스타일 변경을 즉시 적용·리페인트시킨다. 스타일 변경 직후 즉각 반영을 강제할 때.
- `getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }` — 부모 기준 CSS `top`/`left` 좌표 계산. 뷰포트 위치(`getBoundingClientRect`)·부모 내부 스크롤(`scrollTop`/`scrollLeft`)·중간 요소 border 두께·CSS `transform`(`DOMMatrix` 로 보정)까지 반영해, 드롭다운/팝업 위치 지정에 바로 쓸 좌표를 반환. 부모가 `HTMLElement` 가 아니면(선택자 미일치 등) `ArgumentError` throw.
  - `parent: HTMLElement | string` — 기준 부모. 문자열이면 `this.closest(parent)` 로 조상 탐색, 요소면 직접 사용(예: `document.body`, `".container"`).
- `scrollIntoViewIfNeeded(target: { top: number; left: number }, offset?: { top: number; left: number }): void` — 대상이 스크롤 영역의 상단/좌측 경계를 벗어났을 때만(`target.top - scrollTop < offset.top`) 그쪽으로 스크롤해 보이게 함. 하단/우측 방향은 처리하지 않고 브라우저 기본 포커스 스크롤에 위임. 고정 헤더/컬럼이 있는 테이블의 포커스 처리에.
  - `target: { top: number; left: number }` — 컨테이너 내 대상 위치(`offsetTop`/`offsetLeft` 기준).
  - `offset?: { top: number; left: number }` — 가려지면 안 되는 영역 크기(고정 헤더 높이·고정 컬럼 너비). 기본 `{ top: 0, left: 0 }`.

```ts
const { top, left } = popupEl.getRelativeOffset(".container");
scrollEl.scrollIntoViewIfNeeded({ top: cellTop, left: cellLeft }, { top: headerH, left: fixedW });
```

## 클립보드 / 경계 측정 정적 함수

이벤트 핸들러로 붙이거나 다중 요소를 한 번에 처리하는 함수. 프로토타입 확장이 아니라 named export 이므로 직접 import.

- `copyElement(event: ClipboardEvent): void` — copy 이벤트 핸들러용. 이벤트 타겟 내 첫 `input/textarea` 의 `value` 를 클립보드 `text/plain` 으로 기록하고 `preventDefault`. `clipboardData` 가 없거나 타겟이 Element 가 아니거나 input/textarea 가 없으면 무동작(기본 동작 유지).
  - `event: ClipboardEvent` — copy 이벤트 객체. `el.addEventListener("copy", copyElement)` 로 등록.
- `pasteToElement(event: ClipboardEvent): void` — paste 이벤트 핸들러용. 타겟 내 첫 `input/textarea` 의 전체 `value` 를 클립보드 `text/plain` 텍스트로 교체하고 `input` 이벤트를 dispatch(`bubbles: true`)한 뒤 `preventDefault`. 커서 위치·선택 영역은 무시하고 전체를 치환. 조건 미충족 시 무동작.
  - `event: ClipboardEvent` — paste 이벤트 객체. `el.addEventListener("paste", pasteToElement)` 로 등록.
- `getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>` — `IntersectionObserver` 로 여러 요소의 뷰포트 기준 경계를 한 번에 측정. 중복 요소는 제거하고 입력 순서대로 정렬해 반환. 빈 배열이면 즉시 `[]`. 모든 요소 관측 완료 시 resolve, 제한시간 초과 시 `TimeoutError` 로 reject(어느 경우든 `finally` 에서 observer `disconnect`).
  - `els: Element[]` — 측정 대상. 중복은 제거되고 결과는 입력 순서로 정렬됨.
  - `timeout?: number` — 제한시간(ms). 기본 `5000`. 초과 시 `TimeoutError`.
- `ElementBounds` (반환 항목 타입):
  - `target: Element` — 측정된 요소.
  - `top: number` — 뷰포트 기준 상단 위치(`boundingClientRect.top`).
  - `left: number` — 뷰포트 기준 좌측 위치(`boundingClientRect.left`).
  - `width: number` — 요소 너비(`boundingClientRect.width`).
  - `height: number` — 요소 높이(`boundingClientRect.height`).

```ts
inputEl.addEventListener("copy", copyElement);
inputEl.addEventListener("paste", pasteToElement);
const bounds = await getBounds([elA, elB], 3000);
```
