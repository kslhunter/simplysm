# @simplysm/core-browser

> SimplySM 프레임워크의 브라우저 전용 DOM 유틸리티 패키지

## 설치

```bash
yarn add @simplysm/core-browser
```

## 요구사항

- **브라우저**: Chrome 79+
- **의존성**: `@simplysm/core-common`

> **주의**: 이 패키지는 브라우저 환경에서만 동작합니다. Node.js 환경에서는 사용할 수 없습니다.

## API

### Blob 유틸리티

#### `downloadBlob(blob, fileName)`

Blob을 파일로 다운로드합니다.

```typescript
import { downloadBlob } from "@simplysm/core-browser";

const blob = new Blob(["Hello, World!"], { type: "text/plain" });
downloadBlob(blob, "hello.txt");
```

---

### Element 유틸리티

#### `prependChild(parent, child)`

요소를 첫 번째 자식으로 삽입합니다.

```typescript
import { prependChild } from "@simplysm/core-browser";

const newItem = document.createElement("div");
prependChild(container, newItem);
```

#### `findAll(el, selector)`

셀렉터로 하위 요소 전체를 검색합니다. `:scope`가 자동 적용됩니다.

```typescript
import { findAll } from "@simplysm/core-browser";

const items = findAll(container, ".item");
const buttons = findAll<HTMLButtonElement>(container, "button");
```

#### `findFirst(el, selector)`

셀렉터로 첫 번째 하위 요소를 검색합니다.

```typescript
import { findFirst } from "@simplysm/core-browser";

const firstItem = findFirst(container, ".item");
if (firstItem !== undefined) {
  // ...
}
```

#### `getParents(el)`

모든 부모 요소 목록을 반환합니다 (가까운 순서).

```typescript
import { getParents } from "@simplysm/core-browser";

const parents = getParents(element);
```

#### `isFocusable(el)`

요소가 포커스 가능한지 확인합니다.

```typescript
import { isFocusable } from "@simplysm/core-browser";

if (isFocusable(element)) {
  element.focus();
}
```

#### `findFocusableAll(el)`

하위의 모든 포커스 가능 요소를 검색합니다.

```typescript
import { findFocusableAll } from "@simplysm/core-browser";

const focusables = findFocusableAll(container);
```

#### `findFocusableFirst(el)`

첫 번째 포커스 가능 하위 요소를 검색합니다.

```typescript
import { findFocusableFirst } from "@simplysm/core-browser";

const firstFocusable = findFocusableFirst(container);
firstFocusable?.focus();
```

#### `findFocusableParent(el)`

부모 중 첫 번째 포커스 가능 요소를 검색합니다.

```typescript
import { findFocusableParent } from "@simplysm/core-browser";

const focusableParent = findFocusableParent(element);
```

#### `isOffsetElement(el)`

요소가 offset 기준 요소인지 확인합니다 (position: relative/absolute/fixed/sticky).

```typescript
import { isOffsetElement } from "@simplysm/core-browser";

if (isOffsetElement(element)) {
  // offset 계산의 기준이 되는 요소
}
```

#### `isVisible(el)`

요소가 화면에 보이는지 확인합니다.

```typescript
import { isVisible } from "@simplysm/core-browser";

if (isVisible(element)) {
  // 요소가 보이는 상태
}
```

#### `copyElement(event)`

요소 내용을 클립보드에 복사합니다 (copy 이벤트 핸들러에서 사용).
input/textarea가 있으면 value를 복사, 없으면 기본 동작을 유지합니다.

```typescript
import { copyElement } from "@simplysm/core-browser";

element.addEventListener("copy", copyElement);
```

#### `pasteToElement(event)`

클립보드 내용을 요소에 붙여넣습니다 (paste 이벤트 핸들러에서 사용).

```typescript
import { pasteToElement } from "@simplysm/core-browser";

element.addEventListener("paste", pasteToElement);
```

---

### HTMLElement 유틸리티

#### `repaint(el)`

강제 리페인트를 트리거합니다 (reflow).

```typescript
import { repaint } from "@simplysm/core-browser";

element.style.height = "100px";
repaint(element); // 변경사항 즉시 반영
```

#### `getRelativeOffset(el, parent)`

부모 요소 기준 상대 위치를 계산합니다.

```typescript
import { getRelativeOffset } from "@simplysm/core-browser";

// HTMLElement로 지정
const offset = getRelativeOffset(child, parentElement);

// 셀렉터로 지정
const offset2 = getRelativeOffset(child, ".container");

console.log(offset.top, offset.left);
```

#### `scrollIntoViewIfNeeded(container, target, offset?)`

필요시 스크롤하여 대상 위치를 보이게 합니다.

```typescript
import { scrollIntoViewIfNeeded, getRelativeOffset } from "@simplysm/core-browser";

const targetOffset = getRelativeOffset(targetElement, container);
scrollIntoViewIfNeeded(container, targetOffset, { top: 10, left: 10 });
```

#### `getBoundsAsync(els)`

IntersectionObserver를 사용하여 요소들의 bounds 정보를 비동기로 조회합니다.

```typescript
import { getBoundsAsync } from "@simplysm/core-browser";

const bounds = await getBoundsAsync([element1, element2]);
bounds.forEach((b) => {
  console.log(b.target, b.top, b.left, b.width, b.height);
});
```

---

## 타입

### `FocusableElement`

포커스 가능한 요소 타입입니다.

```typescript
type FocusableElement = Element & HTMLOrSVGElement;
```

---

## 라이선스

MIT
