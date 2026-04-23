# `SdIntersectionDirective`

IntersectionObserver 기반 intersection output 이벤트 디렉티브.

```typescript
@Directive({ selector: "[sdIntersection]" })
class SdIntersectionDirective {
  sdIntersection = output<SdIntersectionEvent>();
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `sdIntersection` | output | `SdIntersectionEvent` | 뷰포트와의 교차 변경 시 발생 |

## Related Types

### `SdIntersectionEvent`

```typescript
interface SdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `entry` | `IntersectionObserverEntry` | 마지막 IntersectionObserver 엔트리 |

## Usage

```html
<div (sdIntersection)="onIntersect($event)"></div>
```
