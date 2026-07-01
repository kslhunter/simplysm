# @simplysm/core-browser — DOM 요소 확장

DOM 요소를 직접 다루는 작업에서 함께 읽는 묶음이다. entry import 시 브라우저 환경에서 `Element.prototype`/`HTMLElement.prototype` 확장 메서드가 등록되고, 클립보드·경계 측정 정적 함수는 named export로 사용한다.

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

- `findAll(selector)` — `selector`는 CSS 선택자. `trim()` 결과가 빈 문자열이면 `[]`, 아니면 `querySelectorAll` 결과를 배열로 반환한다. `TEl`로 반환 요소 타입을 지정한다(기본 `Element`).
- `findFirst(selector)` — `selector`는 CSS 선택자. `trim()` 결과가 빈 문자열이면 `undefined`, 아니면 첫 `querySelector` 결과를 `TEl | undefined`로 반환한다. `TEl`로 첫 일치 요소 타입을 지정한다(기본 `Element`).
- `prependChild(child)` — `child`(삽입할 요소)를 `insertBefore(child, firstElementChild)`로 첫 자식 앞에 넣고 같은 요소를 반환한다.
- `getParents()` — `parentNode`를 타고 올라가며 `Element`인 조상만 가까운 순서로 배열에 담아 반환한다.
- `findTabbableParent()` — `parentElement`를 위로 순회하며 `tabbable`의 `isTabbable`이 참인 첫 `HTMLElement` 조상을 반환한다. 없으면 `undefined`.
- `findFirstTabbableChild()` — `TreeWalker(NodeFilter.SHOW_ELEMENT)` 깊이 우선 순회 중 `isTabbable`이 참인 첫 `HTMLElement` 자식을 반환한다. 없으면 `undefined`.
- `isOffsetElement()` — `getComputedStyle(this).position`이 `relative`/`absolute`/`fixed`/`sticky` 중 하나면 `true`, 그 외 값이면 `false`. offset 기준 요소(positioned) 판정에 쓴다.
- `isVisible()` — `getClientRects().length > 0`, `visibility !== "hidden"`, `opacity !== "0"`을 모두 만족하면 `true`. 화면 노출 여부 판정에 쓴다.

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

- `repaint()` — `offsetHeight`에 접근해 강제 동기 레이아웃(reflow)을 트리거한다. 반환값 없음.
- `getRelativeOffset(parent)` — `parent`는 기준 부모. 문자열이면 `this.closest(parent)`로 찾고, 결과가 `HTMLElement`가 아니면 `ArgumentError({ parent })`를 던진다. CSS `top`/`left`에 바로 쓸 좌표를 반환한다.
- `getRelativeOffset` 반환 `top` — `elementRect.top - parentRect.top + parentEl.scrollTop`을 기준으로 중간 부모들의 `borderTopWidth`를 더하고, element/parent에 transform이 있으면 행렬 역변환으로 보정한 값이다.
- `getRelativeOffset` 반환 `left` — `elementRect.left - parentRect.left + parentEl.scrollLeft`을 기준으로 중간 부모들의 `borderLeftWidth`를 더하고, transform이 있으면 행렬 역변환으로 보정한 값이다.
- `scrollIntoViewIfNeeded(target, offset?)` — 고정 헤더/컬럼 등 `offset` 영역에 가려진 대상을 보이게 스크롤한다. 상단/좌측 경계를 벗어나는 경우만 처리하고, 하단/우측은 브라우저 기본 동작에 의존한다.
- `scrollIntoViewIfNeeded` `target.top` — 컨테이너 기준 대상 상단 위치. `target.top - scrollTop < offset.top`이면 `scrollTop`을 `target.top - offset.top`으로 바꾼다.
- `scrollIntoViewIfNeeded` `target.left` — 컨테이너 기준 대상 좌측 위치. `target.left - scrollLeft < offset.left`이면 `scrollLeft`를 `target.left - offset.left`로 바꾼다.
- `scrollIntoViewIfNeeded` `offset.top`/`offset.left` — 각각 상단/좌측에서 가려지면 안 되는 영역 크기(고정 헤더 높이·고정 컬럼 너비 등). 미지정 시 `{ top: 0, left: 0 }`을 쓴다.

## copyElement

```ts
function copyElement(event: ClipboardEvent): void;
```

copy 이벤트 핸들러로 쓴다. 이벤트 타겟 안의 첫 `input, textarea`를 찾아 그 `value`를 `clipboardData.setData("text/plain", value)`로 기록하고 `event.preventDefault()`를 호출한다.

- `event` — copy 이벤트 객체. `clipboardData`가 없거나 `target`이 `Element`가 아니면 아무 작업도 하지 않는다.
- 미일치 — 타겟 안에 `input`/`textarea`가 없으면 클립보드와 기본 동작을 변경하지 않는다.

## pasteToElement

```ts
function pasteToElement(event: ClipboardEvent): void;
```

paste 이벤트 핸들러로 쓴다. `clipboardData.getData("text/plain")` 값을 이벤트 타겟 안 첫 `input, textarea`의 전체 `value`로 교체하고, `new Event("input", { bubbles: true })`를 dispatch한 뒤 `event.preventDefault()`를 호출한다. 커서 위치·선택 영역은 고려하지 않고 전체 값을 바꾼다.

- `event` — paste 이벤트 객체. `clipboardData`가 없거나 `target`이 `Element`가 아니면 아무 작업도 하지 않는다.
- 미일치 — 타겟 안에 `input`/`textarea`가 없으면 값과 기본 동작을 그대로 둔다.

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

`IntersectionObserver`로 여러 요소의 뷰포트 기준 경계를 비동기 측정한다.

- `els` — 측정 대상 요소 배열. `Map`으로 중복 요소를 제거하고, 결과는 입력 인덱스 순서로 정렬한다. 빈 배열이면 즉시 `[]`를 반환한다.
- `timeout` — 제한 시간(ms), 기본값 `5000`. 제한 시간 내 모든 요소 관측이 모이지 않으면 `TimeoutError(undefined, "<timeout>ms timeout")`로 reject한다.
- `ElementBounds.target` — 관측된 대상 요소.
- `ElementBounds.top`/`left`/`width`/`height` — 각각 `IntersectionObserverEntry.boundingClientRect`의 `top`/`left`/`width`/`height` 값이다.
- 정리 — 관측 완료·타임아웃 어느 경로에서도 `finally`에서 observer를 `disconnect()`한다.
