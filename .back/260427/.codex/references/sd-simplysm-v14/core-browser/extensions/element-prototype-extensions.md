# Element / HTMLElement Prototype Extensions

> **읽어야 하는 상황**: DOM 요소 검색/탐색, 탭 이동 가능 요소 찾기, 가시성/위치 확인, 강제 리페인트, 스크롤 조정이 필요할 때. 여러 요소의 경계 정보를 비동기로 조회하려면 [`getBounds`](./get-bounds.md), copy/paste 이벤트 핸들러는 [`copyElement`/`pasteToElement`](./copy-paste.md) 참조.

패키지를 임포트하면 사이드 이펙트로 `Element`와 `HTMLElement` 프로토타입에 메서드가 추가된다. 별도 등록 없이 `import "@simplysm/core-browser"` 또는 개별 모듈 임포트로 활성화된다.

## When to use

- ✅ DOM 요소 검색/탐색이 필요할 때 (`findAll`, `findFirst`, `getParents`)
- ✅ 탭 이동 가능한 요소를 찾을 때 (`findTabbableParent`, `findFirstTabbableChild`)
- ✅ 요소 가시성/위치 확인이 필요할 때 (`isVisible`, `isOffsetElement`, `getRelativeOffset`)
- ✅ 강제 리페인트나 스크롤 조정이 필요할 때 (`repaint`, `scrollIntoViewIfNeeded`)
- ❌ 여러 요소의 경계 정보를 비동기로 조회 → [`getBounds`](./get-bounds.md)
- ❌ Node.js 환경 → DOM API가 없으므로 사용 불가

## Element Prototype Methods

```typescript
// 선택자와 일치하는 모든 하위 요소 검색. 빈 선택자 → 빈 배열.
element.findAll<TEl extends Element = Element>(selector: string): TEl[]

// 선택자와 일치하는 첫 번째 요소. 빈 선택자 → undefined.
element.findFirst<TEl extends Element = Element>(selector: string): TEl | undefined

// 요소를 첫 번째 자식으로 삽입. 삽입된 자식 요소를 반환.
element.prependChild<TEl extends Element>(child: TEl): TEl

// 모든 부모 요소 배열 (가장 가까운 것부터 먼 것 순서)
element.getParents(): Element[]

// 첫 번째 탭 이동 가능한 부모 요소 (tabbable 라이브러리 사용). 없으면 undefined.
element.findTabbableParent(): HTMLElement | undefined

// 첫 번째 탭 이동 가능한 자식 요소 (TreeWalker + tabbable 사용). 없으면 undefined.
element.findFirstTabbableChild(): HTMLElement | undefined

// position이 relative/absolute/fixed/sticky인지 확인
element.isOffsetElement(): boolean

// 화면에 보이는지 확인 (clientRects 존재 + visibility !== "hidden" + opacity !== "0")
element.isVisible(): boolean
```

## HTMLElement Prototype Methods

```typescript
// 강제 리페인트. offsetHeight 접근으로 동기 reflow를 트리거한다.
htmlElement.repaint(): void

// 부모 요소 기준 상대 위치 계산. CSS top/left 속성에 바로 사용 가능한 좌표 반환.
// parent: HTMLElement 인스턴스 또는 CSS 선택자 문자열 (closest()로 탐색)
// border 두께, CSS transform 변환을 모두 포함하여 계산한다.
// 부모를 찾을 수 없으면 ArgumentError를 던진다.
htmlElement.getRelativeOffset(parent: HTMLElement | string): { top: number; left: number }

// offset 영역(고정 헤더/컬럼)에 가려진 경우 대상이 보이도록 스크롤 조정.
// target: 컨테이너 내 대상 위치 (offsetTop, offsetLeft)
// offset: 가려지면 안 되는 영역 크기 (기본값 { top: 0, left: 0 })
// 상단/좌측 방향만 처리. 하단/우측은 브라우저 기본 포커스 스크롤에 의존.
htmlElement.scrollIntoViewIfNeeded(
  target: { top: number; left: number },
  offset?: { top: number; left: number }
): void
```

## Usage

### 최소 예제

```typescript
import "@simplysm/core-browser";

const container = document.querySelector(".container")!;
const buttons = container.findAll<HTMLButtonElement>("button");
const firstInput = container.findFirst<HTMLInputElement>("input[type=text]");
```

### 전형 예제 — 포커스 이동 가능한 요소 탐색

```typescript
import "@simplysm/core-browser";

// 현재 요소에서 가장 가까운 탭 이동 가능한 부모로 포커스 이동
function focusNearestTabbableParent(el: Element): void {
  const tabbable = el.findTabbableParent();
  if (tabbable != null) {
    tabbable.focus();
  }
}

// 컨테이너 내 첫 번째 탭 이동 가능한 자식으로 포커스
function focusFirstChild(container: Element): void {
  const child = container.findFirstTabbableChild();
  if (child != null) {
    child.focus();
  }
}
```

### 전형 예제 — 드롭다운 위치 계산

```typescript
import "@simplysm/core-browser";

function positionDropdown(trigger: HTMLElement, dropdown: HTMLElement): void {
  // position: relative/absolute 부모를 찾아 상대 좌표 계산
  const offset = trigger.getRelativeOffset(dropdown.offsetParent as HTMLElement);
  dropdown.style.top = `${offset.top + trigger.offsetHeight}px`;
  dropdown.style.left = `${offset.left}px`;
}
```

## 🚫 Anti-patterns

### 빈 선택자로 findAll/findFirst 호출

```typescript
// ❌ 빈 문자열은 빈 배열/undefined를 반환하므로 의미 없는 호출
const els = container.findAll("");

// ✅ 빈 선택자 가능성이 있으면 호출 전에 검사
if (selector !== "") {
  const els = container.findAll(selector);
}
```

**근거**: 내부에서 `trim()` 후 빈 문자열이면 즉시 빈 결과를 반환한다. 에러는 나지 않지만 불필요한 호출이다.

### getRelativeOffset에 존재하지 않는 선택자 전달

```typescript
// ❌ 선택자가 일치하지 않으면 ArgumentError 발생
element.getRelativeOffset(".nonexistent-class");

// ✅ 확실한 부모 요소를 직접 전달
element.getRelativeOffset(parentElement);
```

**근거**: 문자열을 전달하면 `closest()`로 탐색하므로, 일치하는 부모가 없으면 `ArgumentError`가 발생한다.
