# @simplysm/core-browser

> SIMPLYSM 프레임워크의 브라우저 전용 DOM 유틸리티 패키지

## 설치

```bash
yarn add @simplysm/core-browser
```

## 요구사항

- **브라우저**: Chrome 79+
- **의존성**: `@simplysm/core-common`, `tabbable`

> **주의**: 이 패키지는 브라우저 환경에서만 동작합니다. Node.js 환경에서는 사용할 수 없습니다.

## API

### BlobUtils

Blob 관련 유틸리티.

#### `BlobUtils.download(blob, fileName)`

Blob을 파일로 다운로드합니다.

```typescript
import { BlobUtils } from "@simplysm/core-browser";

const blob = new Blob(["Hello, World!"], { type: "text/plain" });
BlobUtils.download(blob, "hello.txt");
```

---

### ElementUtils

Element 관련 유틸리티.

#### `ElementUtils.prependChild(parent, child)`

요소를 첫 번째 자식으로 삽입합니다.

```typescript
import { ElementUtils } from "@simplysm/core-browser";

const newItem = document.createElement("div");
ElementUtils.prependChild(container, newItem);
```

#### `ElementUtils.findAll(el, selector)`

셀렉터로 하위 요소 전체를 검색합니다. `:scope`가 자동 적용됩니다.

```typescript
import { ElementUtils } from "@simplysm/core-browser";

const items = ElementUtils.findAll(container, ".item");
const buttons = ElementUtils.findAll<HTMLButtonElement>(container, "button");
```

#### `ElementUtils.findFirst(el, selector)`

셀렉터로 첫 번째 하위 요소를 검색합니다.

```typescript
import { ElementUtils } from "@simplysm/core-browser";

const firstItem = ElementUtils.findFirst(container, ".item");
if (firstItem !== undefined) {
  // ...
}
```

#### `ElementUtils.getParents(el)`

모든 부모 요소 목록을 반환합니다 (가까운 순서).

```typescript
import { ElementUtils } from "@simplysm/core-browser";

const parents = ElementUtils.getParents(element);
```

#### `ElementUtils.findFocusableParent(el)`

부모 중 첫 번째 포커스 가능 요소를 검색합니다.

```typescript
import { ElementUtils } from "@simplysm/core-browser";

const focusableParent = ElementUtils.findFocusableParent(element);
```

> **참고**: 포커스 가능 여부 확인(`isFocusable`), 포커스 가능 요소 목록 조회(`focusable`, `tabbable`) 등은 `tabbable` 패키지를 직접 사용하세요.
>
> ```typescript
> import { isFocusable, focusable } from "tabbable";
>
> if (isFocusable(element)) {
>   element.focus();
> }
> const focusableElements = focusable(container);
> ```

#### `ElementUtils.isOffsetElement(el)`

요소가 offset 기준 요소인지 확인합니다 (position: relative/absolute/fixed/sticky).

```typescript
import { ElementUtils } from "@simplysm/core-browser";

if (ElementUtils.isOffsetElement(element)) {
  // offset 계산의 기준이 되는 요소
}
```

#### `ElementUtils.isVisible(el)`

요소가 화면에 보이는지 확인합니다.

```typescript
import { ElementUtils } from "@simplysm/core-browser";

if (ElementUtils.isVisible(element)) {
  // 요소가 보이는 상태
}
```

#### `ElementUtils.copyElement(event)`

요소 내용을 클립보드에 복사합니다 (copy 이벤트 핸들러에서 사용).
input/textarea가 있으면 value를 복사, 없으면 기본 동작을 유지합니다.

```typescript
import { ElementUtils } from "@simplysm/core-browser";

element.addEventListener("copy", ElementUtils.copyElement);
```

#### `ElementUtils.pasteToElement(event)`

클립보드 내용을 요소에 붙여넣습니다 (paste 이벤트 핸들러에서 사용).

```typescript
import { ElementUtils } from "@simplysm/core-browser";

element.addEventListener("paste", ElementUtils.pasteToElement);
```

---

### HtmlElementUtils

HTMLElement 전용 유틸리티.

#### `HtmlElementUtils.repaint(el)`

강제 리페인트를 트리거합니다 (reflow).

```typescript
import { HtmlElementUtils } from "@simplysm/core-browser";

element.style.height = "100px";
HtmlElementUtils.repaint(element); // 변경사항 즉시 반영
```

#### `HtmlElementUtils.getRelativeOffset(el, parent)`

부모 요소 기준 상대 위치를 계산합니다.

```typescript
import { HtmlElementUtils } from "@simplysm/core-browser";

// HTMLElement로 지정
const offset = HtmlElementUtils.getRelativeOffset(child, parentElement);

// 셀렉터로 지정
const offset2 = HtmlElementUtils.getRelativeOffset(child, ".container");

console.log(offset.top, offset.left);
```

#### `HtmlElementUtils.scrollIntoViewIfNeeded(container, target, offset?)`

필요시 스크롤하여 대상 위치를 보이게 합니다.

```typescript
import { HtmlElementUtils } from "@simplysm/core-browser";

const targetOffset = HtmlElementUtils.getRelativeOffset(targetElement, container);
HtmlElementUtils.scrollIntoViewIfNeeded(container, targetOffset, { top: 10, left: 10 });
```

#### `HtmlElementUtils.getBoundsAsync(els, timeout?)`

IntersectionObserver를 사용하여 요소들의 bounds 정보를 비동기로 조회합니다.

```typescript
import { HtmlElementUtils } from "@simplysm/core-browser";

const bounds = await HtmlElementUtils.getBoundsAsync([element1, element2]);
bounds.forEach((b) => {
  console.log(b.target, b.top, b.left, b.width, b.height);
});

// 커스텀 타임아웃 (기본: 5000ms)
const bounds2 = await HtmlElementUtils.getBoundsAsync([element], 10000);
```

---

## 타입

### `HtmlElementUtils.ElementBounds`

요소의 bounds 정보 타입입니다.

```typescript
interface ElementBounds {
  target: HTMLElement;
  top: number;
  left: number;
  width: number;
  height: number;
}
```

---

## 라이선스

MIT
