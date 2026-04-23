# `copyElement` / `pasteToElement`

클립보드 이벤트 핸들러에서 input/textarea 값을 클립보드와 동기화하는 함수 쌍.

## When to use

- ✅ `copy`/`paste` 이벤트 핸들러에서 커스텀 클립보드 동작이 필요할 때
- ❌ 임의 시점에 클립보드에 접근 → `navigator.clipboard` API 직접 사용

## Signature

```typescript
export function copyElement(event: ClipboardEvent): void
export function pasteToElement(event: ClipboardEvent): void
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `event` | `ClipboardEvent` | copy 또는 paste 이벤트 객체 |

## Usage

### 최소 예제

```typescript
import { copyElement, pasteToElement } from "@simplysm/core-browser";

document.addEventListener("copy", copyElement);
document.addEventListener("paste", pasteToElement);
```

## 동작 상세

### `copyElement`

이벤트 타겟 요소 내의 첫 번째 `input` 또는 `textarea`를 찾아 그 `value`를 `clipboardData.setData("text/plain", ...)`로 설정하고 `event.preventDefault()`를 호출한다. 해당 요소가 없으면 아무 동작도 하지 않는다.

### `pasteToElement`

이벤트 타겟 요소 내의 첫 번째 `input` 또는 `textarea`를 찾아 값 전체를 클립보드 텍스트(`text/plain`)로 교체한다. 교체 후 `input` 이벤트를 dispatch한다. 커서 위치나 선택 영역은 고려하지 않으며, 값 전체가 대체된다.

## 🚫 Anti-patterns

### 커서 위치를 유지하면서 붙여넣기

```typescript
// ❌ pasteToElement는 전체 값을 대체함 — 커서 위치 보존 불가
document.addEventListener("paste", pasteToElement);

// ✅ 커서 위치 기반 삽입이 필요하면 직접 구현
document.addEventListener("paste", (e) => {
  const text = e.clipboardData?.getData("text/plain");
  // selectionStart/selectionEnd를 사용한 직접 삽입 로직
});
```

**근거**: `pasteToElement`는 `firstInputEl.value = contentText`로 전체 교체한다. 부분 삽입이 필요한 경우에는 적합하지 않다.
