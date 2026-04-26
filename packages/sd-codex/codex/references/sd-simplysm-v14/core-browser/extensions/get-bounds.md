# `getBounds`

> **읽어야 하는 상황**: IntersectionObserver를 사용하여 여러 요소의 뷰포트 기준 위치·크기를 비동기로 조회할 때. 단일 요소의 즉시 측정은 `getBoundingClientRect()`로 충분하고, 요소 가시성만 확인하려면 [`element.isVisible()`](./element-prototype-extensions.md) 참조.

## When to use

- ✅ 여러 요소의 뷰포트 기준 위치/크기를 한 번에 조회할 때
- ✅ `getBoundingClientRect()`가 정확하지 않은 타이밍(예: 레이아웃 직후)에 안정적인 측정이 필요할 때
- ❌ 단일 요소의 즉시 측정 → `getBoundingClientRect()`로 충분
- ❌ 요소 가시성만 확인 → `element.isVisible()` 프로토타입 확장 사용

## Signature

```typescript
export async function getBounds(
  els: Element[],
  timeout?: number, // 기본값: 5000 (ms)
): Promise<ElementBounds[]>
```

## Parameters

| Param | Type | Description |
|-------|------|-------------|
| `els` | `Element[]` | 측정 대상 요소 배열. 중복은 자동 제거. 빈 배열이면 빈 결과 반환 |
| `timeout` | `number` | 타임아웃 밀리초. 기본값 5000. 시간 내에 모든 요소의 측정이 완료되지 않으면 `TimeoutError` 발생 |

## Returns

`Promise<ElementBounds[]>` — 입력 순서대로 정렬된 경계 정보 배열.

## Usage

### 최소 예제

```typescript
import { getBounds } from "@simplysm/core-browser";

const elements = document.querySelectorAll(".card");
const bounds = await getBounds([...elements]);
// bounds[0].top, bounds[0].left, bounds[0].width, bounds[0].height
```

### 전형 예제 — 타임아웃 처리

```typescript
import { getBounds } from "@simplysm/core-browser";
import { TimeoutError } from "@simplysm/core-common";

try {
  const bounds = await getBounds(targetElements, 3000); // 3초 타임아웃
  for (const b of bounds) {
    // b.target: 원본 요소 참조
    // b.top, b.left: 뷰포트 기준 좌표
    // b.width, b.height: 요소 크기
  }
} catch (err) {
  if (err instanceof TimeoutError) {
    // 요소가 DOM에서 제거되었거나 display:none인 경우 IntersectionObserver가 응답하지 않을 수 있음
  }
}
```

## Related Types

### `ElementBounds`

```typescript
export interface ElementBounds {
  target: Element;
  top: number;
  left: number;
  width: number;
  height: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `target` | `Element` | 측정 대상 요소 |
| `top` | `number` | 뷰포트 기준 상단 위치 |
| `left` | `number` | 뷰포트 기준 좌측 위치 |
| `width` | `number` | 요소 너비 |
| `height` | `number` | 요소 높이 |
