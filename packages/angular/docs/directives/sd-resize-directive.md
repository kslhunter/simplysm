# `SdResizeDirective`

ResizeObserver 기반 resize output 이벤트 디렉티브. `requestAnimationFrame`으로 디바운스.

```typescript
@Directive({ selector: "[sdResize]" })
class SdResizeDirective {
  sdResize = output<SdResizeEvent>();
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `sdResize` | output | `SdResizeEvent` | 요소 크기 변경 시 발생 |

## Related Types

### `SdResizeEvent`

```typescript
interface SdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: HTMLElement;
  contentRect: DOMRectReadOnly;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `heightChanged` | `boolean` | 높이 변경 여부 |
| `widthChanged` | `boolean` | 너비 변경 여부 |
| `target` | `HTMLElement` | 대상 요소 |
| `contentRect` | `DOMRectReadOnly` | 컨텐츠 영역 크기 |

## Usage

```html
<div (sdResize)="onResize($event)"></div>
```
