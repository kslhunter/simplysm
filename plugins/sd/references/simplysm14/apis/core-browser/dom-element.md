# @simplysm/core-browser — DOM 요소 확장

DOM 요소를 직접 다룰 때 함께 읽는 묶음입니다.

- 구성: prototype 확장(`Element`, `HTMLElement`)과 이벤트, 다중요소용 정적 함수.
- 확장 메서드는 `typeof Element !== "undefined"`, `typeof HTMLElement !== "undefined"` 가드 안에서만 등록됩니다.
  - SSR(프리렌더) 경로에서는 등록되지 않으므로 서버 실행 코드에서 호출하면 안 됩니다.

## Element 확장

```ts
interface Element {
  findAll<TEl extends Element = Element>(selector: string): TEl[];
  findFirst<TEl extends Element = Element>(selector: string): TEl | undefined;
  prependChild<TEl extends Element>(child: TEl): TEl;
  getParents(): Element[];
  findTabbableParent(): HTMLElement | undefined;
  findFirstTabbableChild(): HTMLElement | undefined;
  isOffsetElement(): boolean;
  isVisible(): boolean;
}
```

- `findAll(selector)` — 선택자와 일치하는 모든 하위 요소를 배열로 반환합니다.
  - `selector.trim()` 이 빈 문자열이면 `querySelectorAll` 을 호출하지 않고 `[]` 를 반환합니다(선택자를 조건부로 조립할 때 빈 문자열 가드가 불필요).
  - `TEl` 로 결과 요소 타입을 지정합니다(기본 `Element`).
- `findFirst(selector)` — 선택자와 일치하는 첫 요소입니다.
  - 빈 선택자면 `undefined`, 일치 없으면 `undefined`(`querySelector` 의 `null` 을 `undefined` 로 정규화).
  - `TEl` 로 결과 타입을 지정합니다.
- `prependChild(child)` — `insertBefore(child, this.firstElementChild)` 로 첫 자식 위치에 삽입하고 삽입한 자식을 그대로 반환합니다.
  - 반환값을 이어서 조작할 때 씁니다.
- `getParents()` — `parentNode` 를 거슬러 올라가며 `Element` 인 조상만 수집합니다.
  - 가까운 조상부터 먼 조상 순서입니다.
  - `Element` 가 아닌 노드(예: `ShadowRoot`, `Document`)를 만나면 순회를 멈춥니다.
- `findTabbableParent()` — `parentElement` 를 위로 올라가며 `tabbable` 의 `isTabbable()` 이 참인 첫 조상을 반환합니다.
  - 없으면 `undefined` 입니다.
  - 포커스를 상위로 되돌릴 대상을 찾을 때 씁니다.
- `findFirstTabbableChild()` — `document.createTreeWalker(this, NodeFilter.SHOW_ELEMENT)` 로 문서 순서 순회하며 `isTabbable()` 이 참인 첫 `HTMLElement` 후손을 반환합니다.
  - 없으면 `undefined` 입니다.
  - 컨테이너 진입 시 첫 입력 요소로 포커스를 넘길 때 씁니다.
- `isOffsetElement()` — `getComputedStyle(this).position` 이 `"relative"|"absolute"|"fixed"|"sticky"` 중 하나면 `true` 입니다.
  - 상대좌표 계산의 기준 요소(containing block) 후보를 가릴 때 씁니다.
- `isVisible()` — `getClientRects().length > 0` 이고 `visibility !== "hidden"` 이고 `opacity !== "0"` 이면 `true` 입니다.
  - `display:none`, 화면 밖 미배치는 `getClientRects()` 로 걸러집니다.

## HTMLElement 확장

```ts
interface HTMLElement {
  repaint(): void;
  getRelativeOffset(parent: HTMLElement | string): { top: number; left: number };
  scrollIntoViewIfNeeded(
    target: { top: number; left: number },
    offset?: { top: number; left: number },
  ): void;
}
```

- `repaint()` — `this.offsetHeight` 를 읽어 강제 동기 레이아웃(reflow)을 트리거합니다.
  - 직전 스타일 변경을 즉시 반영해야 하는 경우(예: 트랜지션 재시작) 사용합니다.
- `getRelativeOffset(parent)` — `parent` 기준 상대 좌표를 `{ top, left }` 로 반환합니다.
  - CSS `top`/`left` 에 그대로 넣을 수 있는 값입니다.
  - `parent: HTMLElement | string` — 기준 요소입니다.
    - 문자열이면 `this.closest(parent)` 로 조상 중에서 찾습니다.
    - 결과가 `HTMLElement` 가 아니면(선택자 불일치 포함) `ArgumentError({ parent })` 를 던집니다.
  - 계산 순서:
    - (1) `getBoundingClientRect()` 차 + `parentEl.scrollTop/scrollLeft` 가산합니다.
    - (2) 자신-부모 사이 중간 조상들의 `borderTopWidth`/`borderLeftWidth` 를 누적 가산합니다(`parseFloat` 실패 시 0).
    - (3) 자신 또는 부모에 `transform` 이 걸려 있고 행렬이 항등이 아니면 `parentMatrix.inverse().multiply(elementMatrix)` 로 좌표를 변환합니다.
  - 부모 내부 스크롤이 반영되므로 스크롤된 컨테이너 안에서도 동일한 좌표를 얻습니다.
- `scrollIntoViewIfNeeded(target, offset?)` — 컨테이너(`this`)를 스크롤해 `target` 위치가 offset 영역에 가려지지 않게 합니다.
  - 상단/좌측 침범만 보정하며, 하단/우측은 보정하지 않습니다(브라우저 기본 포커스 스크롤에 위임).
  - `target: { top, left }` — 컨테이너 내부 기준 대상 위치입니다(`offsetTop`, `offsetLeft` 를 넣는 용도).
  - `offset?: { top, left }` — 가려지면 안 되는 고정 영역 크기입니다(고정 헤더 높이, 고정 컬럼 너비).
    - 기본값은 `{ top: 0, left: 0 }` 입니다.
  - 보정식: `target.top - scrollTop < offset.top` 이면 `scrollTop = target.top - offset.top`. `left` 도 동일합니다.

## copyElement

```ts
function copyElement(event: ClipboardEvent): void;
```

`copy` 이벤트 핸들러입니다.
`event.target` 안 첫 `input, textarea` 의 `value` 를 `text/plain` 으로 클립보드에 쓰고 `preventDefault()` 합니다.

- `event: ClipboardEvent` — `clipboardData` 가 `null` 이거나 `target` 이 `Element` 가 아니면 아무 것도 하지 않습니다.
  - 대상 안에 입력 요소가 없어도 기본 동작을 막지 않으므로 브라우저 기본 복사가 그대로 수행됩니다.

## pasteToElement

```ts
function pasteToElement(event: ClipboardEvent): void;
```

`paste` 이벤트 핸들러입니다.
클립보드 `text/plain` 을 `event.target` 안 첫 `input, textarea` 의 `value` 로 통째 교체하고, `new Event("input", { bubbles: true })` 를 dispatch 한 뒤 `preventDefault()` 합니다.

- `event: ClipboardEvent` — 커서 위치, 선택 영역을 고려하지 않고 값 전체를 덮어씁니다.
  - `clipboardData` 가 `null` 이거나 `target` 이 `Element` 가 아니면 아무 것도 하지 않습니다.
  - 입력 요소가 없으면 기본 붙여넣기가 그대로 수행됩니다.
- `input` 이벤트를 bubbles 로 발생시키므로 상위 프레임워크의 양방향 바인딩이 갱신됩니다.

## ElementBounds / getBounds

```ts
interface ElementBounds {
  target: Element;
  top: number;
  left: number;
  width: number;
  height: number;
}

function getBounds(els: Element[], timeout?: number): Promise<ElementBounds[]>;
```

`IntersectionObserver` 로 여러 요소의 뷰포트 기준 경계를 한 번에 비동기 측정합니다.
동기 `getBoundingClientRect()` 반복 호출로 인한 강제 레이아웃을 피할 때 씁니다.

- `els: Element[]` — 측정 대상입니다.
  - 내부에서 `Map` 으로 중복 제거하고, 결과는 입력 인덱스 순서로 정렬해 반환합니다.
  - 중복 제거 후 비어 있으면 즉시 `[]` 로 resolve 합니다.
- `timeout?: number` — 제한 시간(ms)이며 기본값은 `5000` 입니다.
  - 시간 내 모든 요소의 entry 가 도착하지 않으면 `TimeoutError(undefined, "<timeout>ms timeout")` 로 reject 합니다.
- `ElementBounds.target: Element` — 측정된 요소 자신입니다. 입력 배열과 대응시킬 때 씁니다.
- `ElementBounds.top: number` — `entry.boundingClientRect.top`. 뷰포트 기준 상단입니다.
- `ElementBounds.left: number` — `entry.boundingClientRect.left`. 뷰포트 기준 좌측입니다.
- `ElementBounds.width: number` — `entry.boundingClientRect.width`.
- `ElementBounds.height: number` — `entry.boundingClientRect.height`.
- 성공, 타임아웃 어느 경로든 `finally` 에서 `observer.disconnect()` 로 관측을 해제합니다.
