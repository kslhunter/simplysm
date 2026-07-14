# @simplysm/core-browser — DOM 요소 확장

DOM 요소를 직접 다루는 작업에서 함께 읽는 묶음이다. entry(`src/index.ts`)에서 `extensions/element-ext`를 사이드 이펙트로 import할 때, 브라우저 환경에서 `Element.prototype`과 `HTMLElement.prototype`에 메서드를 등록함. SSR(node) 환경에서는 `typeof Element !== "undefined"` 가드에 의해 등록을 건너뜀.

## Element 확장 메서드

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

- `findAll(selector)` — CSS 선택자로 하위 요소를 검색함. 반환 타입을 `TEl`로 지정할 수 있음(기본값 `Element`). 선택자를 `trim()` 후 빈 문자열이면 `[]`를 반환하고, 그 외에는 `querySelectorAll` 결과를 배열로 변환함.
- `findFirst(selector)` — CSS 선택자로 첫 번째 하위 요소를 검색함. 반환 타입을 `TEl`로 지정할 수 있음(기본값 `Element`). 선택자를 `trim()` 후 빈 문자열이면 `undefined`를 반환하고, 그 외에는 `querySelector` 첫 일치 결과를 반환함(없으면 `undefined`).
- `prependChild(child)` — 자식 요소를 첫 번째 위치에 삽입함. `insertBefore(child, firstElementChild)`를 사용하고 삽입된 자식 요소를 반환함.
- `getParents()` — 조상 요소를 모두 수집함. `parentNode`를 거슬러 올라가며 `Element` 타입인 조상만 배열에 담고, 가까운 순서부터 먼 순서로 반환함.
- `findTabbableParent()` — 탭 이동 가능한 조상 요소를 찾음. `parentElement`를 위로 순회하며 `tabbable` 라이브러리의 `isTabbable()` 함수가 참을 반환하는 첫 `HTMLElement` 조상을 찾아 반환하고, 없으면 `undefined`를 반환함.
- `findFirstTabbableChild()` — 탭 이동 가능한 첫 번째 자식 요소를 찾음. `document.createTreeWalker(this, NodeFilter.SHOW_ELEMENT)`로 깊이 우선 순회하며 `isTabbable()`이 참인 첫 `HTMLElement` 자식을 찾아 반환하고, 없으면 `undefined`를 반환함.
- `isOffsetElement()` — 요소가 CSS offset 기준 요소(positioned element)인지 판정함. `getComputedStyle(this).position`이 `"relative"`, `"absolute"`, `"fixed"`, `"sticky"` 중 하나면 `true`, 그 외 값이면 `false`를 반환함. 위치 기준이 필요한 영역 계산에 씀.
- `isVisible()` — 요소가 화면에 보이는지 판정함. `getClientRects().length > 0` (DOM 위치 점유), `visibility !== "hidden"`, `opacity !== "0"`을 모두 만족하면 `true`를 반환함.

## HTMLElement 확장 메서드

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

- `repaint()` — 강제 동기 레이아웃을 트리거하여 리페인트를 발생시킴. `offsetHeight`에 접근하면 브라우저가 현재 레이아웃을 동기 계산하고 스타일 변경이 즉시 반영되어 리페인트가 일어남. 반환값 없음.
- `getRelativeOffset(parent)` — 기준 부모(`parent`) 기준으로 상대 위치를 계산함. `parent`가 문자열이면 `this.closest(parent)`로 찾고, 결과가 `HTMLElement`가 아니면 `ArgumentError({ parent })`를 던짐. CSS `top`/`left` 속성에 직접 사용할 수 있는 좌표를 객체로 반환함. 계산 과정: (1) 뷰포트 기준 위치 `getBoundingClientRect()` 차이, (2) 부모의 스크롤 오프셋 추가, (3) 중간 부모들의 border 너비 누적, (4) transform 행렬 역변환으로 보정.
- `getRelativeOffset` 반환 `top` — 부모 기준 상단 좌표. 계산식: `elementRect.top - parentRect.top + parentEl.scrollTop + 중간부모들의borderTopWidth - transform보정`. CSS `top` 속성 값으로 직접 사용 가능.
- `getRelativeOffset` 반환 `left` — 부모 기준 좌측 좌표. 계산식: `elementRect.left - parentRect.left + parentEl.scrollLeft + 중간부모들의borderLeftWidth - transform보정`. CSS `left` 속성 값으로 직접 사용 가능.
- `scrollIntoViewIfNeeded(target, offset?)` — 고정 헤더·컬럼 등에 가려진 대상을 스크롤해 보이게 함. 상단/좌측 경계 침범만 처리하고, 하단/우측은 브라우저 기본 포커스 스크롤에 의존함.
- `scrollIntoViewIfNeeded` `target.top` — 컨테이너 내 대상의 상단 위치. 대상이 offset 영역 상단보다 높으면(가려지면) `scrollTop`을 조정해 보이게 함. 조정: `target.top - scrollTop < offset.top`이면 `scrollTop = target.top - offset.top`.
- `scrollIntoViewIfNeeded` `target.left` — 컨테이너 내 대상의 좌측 위치. 대상이 offset 영역 좌측보다 왼쪽이면(가려지면) `scrollLeft`를 조정해 보이게 함. 조정: `target.left - scrollLeft < offset.left`이면 `scrollLeft = target.left - offset.left`.
- `scrollIntoViewIfNeeded` `offset.top`/`offset.left` — 각각 상단/좌측에서 가려지면 안 되는 영역의 크기(고정 헤더 높이, 고정 컬럼 너비 등). 미지정 시 `{ top: 0, left: 0 }`을 사용함.

## copyElement

```ts
function copyElement(event: ClipboardEvent): void;
```

`copy` 이벤트 핸들러로 사용함. 이벤트 타겟 요소 내 첫 번째 `input` 또는 `textarea`의 `value`를 클립보드에 기록하고 기본 copy 동작을 취소함. 클립보드 데이터가 없거나 타겟이 `Element`가 아니면 아무 작업도 하지 않음. 타겟 내에 입력 요소가 없으면 클립보드와 기본 동작은 변경하지 않음.

- `event` — `copy` 이벤트 객체. `event.clipboardData`에 데이터를 기록하고 `event.preventDefault()`를 호출함.

## pasteToElement

```ts
function pasteToElement(event: ClipboardEvent): void;
```

`paste` 이벤트 핸들러로 사용함. 클립보드의 평문(`text/plain`) 내용을 이벤트 타겟 요소 내 첫 번째 `input` 또는 `textarea`의 `value`로 설정함. 커서 위치나 선택 영역은 고려하지 않고 전체 값을 교체함. 클립보드 데이터가 없거나 타겟이 `Element`가 아니면 아무 작업도 하지 않음. 타겟 내에 입력 요소가 없으면 값과 기본 동작은 변경하지 않음.

- `event` — `paste` 이벤트 객체. 값 설정 후 input 이벤트(bubbles: true)를 dispatch하고 `event.preventDefault()`를 호출함.

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

`IntersectionObserver`를 사용하여 여러 요소의 뷰포트 기준 경계(바운딩 박스)를 비동기로 측정함.

- `els` — 측정 대상 요소 배열. `Map`으로 중복 요소를 제거하고 결과는 입력 배열의 인덱스 순서로 정렬해 반환함. 빈 배열이면 즉시 `[]`로 resolve함.
- `timeout` — 제한 시간(밀리초), 기본값 `5000`. 제한 시간 내에 모든 요소의 관측 결과가 모이지 않으면 `TimeoutError(undefined, "<timeout>ms timeout")`로 reject함.
- `ElementBounds.target` — 관측된 요소 자체.
- `ElementBounds.top` — `IntersectionObserverEntry.boundingClientRect.top` (뷰포트 기준 상단 좌표).
- `ElementBounds.left` — `IntersectionObserverEntry.boundingClientRect.left` (뷰포트 기준 좌측 좌표).
- `ElementBounds.width` — `IntersectionObserverEntry.boundingClientRect.width` (요소 너비).
- `ElementBounds.height` — `IntersectionObserverEntry.boundingClientRect.height` (요소 높이).
- 정리 — 관측 완료·타임아웃 어느 경로에서도 `finally` 블록에서 `observer.disconnect()`를 호출하여 리소스를 해제함.
