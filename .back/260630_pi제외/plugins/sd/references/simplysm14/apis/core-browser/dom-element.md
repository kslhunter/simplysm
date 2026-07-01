# @simplysm/core-browser — DOM 요소 확장

DOM 요소를 직접 다루는 작업에서 함께 읽는 묶음이다. entry import 시 브라우저 환경에서 `Element.prototype`/`HTMLElement.prototype` 확장 메서드가 등록되고, 정적 함수는 named export로 사용한다.

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

- `findAll.selector: string` — CSS 선택자. `trim()` 결과가 빈 문자열이면 `[]`, 아니면 `querySelectorAll` 결과를 배열로 반환한다.
- `findAll.TEl extends Element = Element` — 반환 요소 타입. 호출 지점에서 기대 요소 타입을 지정할 때 쓴다.
- `findFirst.selector: string` — CSS 선택자. `trim()` 결과가 빈 문자열이면 `undefined`, 아니면 첫 `querySelector` 결과를 `TEl | undefined`로 반환한다.
- `findFirst.TEl extends Element = Element` — 반환 요소 타입. 첫 일치 요소의 구체 타입을 지정할 때 쓴다.
- `prependChild.child: TEl extends Element` — 삽입할 자식 요소. `insertBefore(child, firstElementChild)`로 첫 자식 앞에 넣고 같은 요소를 반환한다.
- `getParents()` — `parentNode`를 타고 올라가며 `Element`인 조상을 가까운 순서로 배열에 담는다.
- `findTabbableParent()` — `parentElement`를 위로 순회하며 `tabbable`의 `isTabbable`이 참인 첫 `HTMLElement` 조상을 반환한다.
- `findFirstTabbableChild()` — `TreeWalker(NodeFilter.SHOW_ELEMENT)`의 깊이 우선 순회 중 `isTabbable`이 참인 첫 `HTMLElement` 자식을 반환한다.
- `isOffsetElement()` — `getComputedStyle(this).position`이 `relative`/`absolute`/`fixed`/`sticky` 중 하나면 `true`, 그 외 값이면 `false`를 반환한다.
- `isVisible()` — `getClientRects().length > 0`, `visibility !== "hidden"`, `opacity !== "0"`을 모두 만족하면 `true`를 반환한다.

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

- `repaint()` — `offsetHeight`에 접근해 브라우저 동기 레이아웃을 트리거한다.
- `getRelativeOffset.parent: HTMLElement | string` — 기준 부모. 문자열이면 `this.closest(parent)`로 찾고, `HTMLElement`가 아니면 `ArgumentError({ parent })`를 던진다.
- `getRelativeOffset` 반환 `top: number` — `elementRect.top - parentRect.top + parentEl.scrollTop`에 중간 부모의 `borderTopWidth`와 transform 보정을 더한 값이다.
- `getRelativeOffset` 반환 `left: number` — `elementRect.left - parentRect.left + parentEl.scrollLeft`에 중간 부모의 `borderLeftWidth`와 transform 보정을 더한 값이다.
- `scrollIntoViewIfNeeded.target.top: number` — 컨테이너 기준 대상 상단 위치. `target.top - scrollTop < offset.top`이면 `scrollTop`을 `target.top - offset.top`으로 바꾼다.
- `scrollIntoViewIfNeeded.target.left: number` — 컨테이너 기준 대상 좌측 위치. `target.left - scrollLeft < offset.left`이면 `scrollLeft`를 `target.left - offset.left`로 바꾼다.
- `scrollIntoViewIfNeeded.offset.top: number` — 상단에서 가려지면 안 되는 영역 크기. 미지정 시 `{ top: 0, left: 0 }`을 쓴다.
- `scrollIntoViewIfNeeded.offset.left: number` — 좌측에서 가려지면 안 되는 영역 크기. 미지정 시 `{ top: 0, left: 0 }`을 쓴다.

## copyElement

```ts
function copyElement(event: ClipboardEvent): void;
```

- `event: ClipboardEvent` — copy 이벤트 객체. `clipboardData`가 없거나 `target`이 `Element`가 아니면 아무 작업도 하지 않는다.
- 동작 — 이벤트 타겟 안의 첫 `input, textarea`를 찾아 그 `value`를 `clipboardData.setData("text/plain", value)`로 기록하고 `event.preventDefault()`를 호출한다.
- 미일치 — 타겟 안에 `input`/`textarea`가 없으면 클립보드와 기본 동작을 변경하지 않는다.

## pasteToElement

```ts
function pasteToElement(event: ClipboardEvent): void;
```

- `event: ClipboardEvent` — paste 이벤트 객체. `clipboardData`가 없거나 `target`이 `Element`가 아니면 아무 작업도 하지 않는다.
- 동작 — `clipboardData.getData("text/plain")` 값을 이벤트 타겟 안의 첫 `input, textarea`의 전체 `value`로 넣고 `new Event("input", { bubbles: true })`를 dispatch한 뒤 `event.preventDefault()`를 호출한다.
- 미일치 — 타겟 안에 `input`/`textarea`가 없으면 값을 변경하지 않고 기본 동작을 유지한다.

## getBounds / ElementBounds

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

- `els: Element[]` — 측정 대상 요소 배열. `Map`으로 중복 요소를 제거하고, 결과는 입력 인덱스 순서로 정렬한다.
- `timeout?: number` — 제한 시간(ms). 기본값은 `5000`이고, 제한 시간 안에 모든 요소의 관측 결과가 모이지 않으면 `TimeoutError(undefined, "<timeout>ms timeout")`로 reject한다.
- `ElementBounds.target: Element` — 관측된 대상 요소.
- `ElementBounds.top: number` — `IntersectionObserverEntry.boundingClientRect.top` 값이다.
- `ElementBounds.left: number` — `IntersectionObserverEntry.boundingClientRect.left` 값이다.
- `ElementBounds.width: number` — `IntersectionObserverEntry.boundingClientRect.width` 값이다.
- `ElementBounds.height: number` — `IntersectionObserverEntry.boundingClientRect.height` 값이다.
- 완료 처리 — 빈 배열이면 즉시 `[]`를 반환하고, 관측 완료·타임아웃 어느 경로에서도 observer를 `disconnect()`한다.
