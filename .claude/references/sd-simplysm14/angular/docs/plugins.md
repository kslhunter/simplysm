# Plugins

모든 플러그인은 `provideSdAngular()`에서 자동 등록된다. Angular의 `EventManagerPlugin`을 확장하여 커스텀 이벤트를 지원한다.

## Command Plugins

커맨드 플러그인은 `document` 레벨에서 keydown을 감지하며, `findTopOpenModalEl()`로 최상위 모달만 이벤트를 수신한다.

### `SdSaveCommandEventPlugin`

Ctrl+S 키 조합 이벤트. 이벤트명: `sdSaveCommand`

```typescript
class SdSaveCommandEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean; // eventName === "sdSaveCommand"
}
```

사용법: `<div (sdSaveCommand)="onSave($event)">`

### `SdRefreshCommandEventPlugin`

Ctrl+Alt+L 키 조합 이벤트. 이벤트명: `sdRefreshCommand`

```typescript
class SdRefreshCommandEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean; // eventName === "sdRefreshCommand"
}
```

### `SdInsertCommandEventPlugin`

Ctrl+Insert 키 조합 이벤트. 이벤트명: `sdInsertCommand`

```typescript
class SdInsertCommandEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean; // eventName === "sdInsertCommand"
}
```

## Observer Plugins

### `SdResizeEventPlugin`

ResizeObserver 기반 이벤트. 이벤트명: `sdResize`. `requestAnimationFrame`으로 디바운스.

```typescript
class SdResizeEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean; // eventName === "sdResize"
}
```

사용법: `<div (sdResize)="onResize($event)">`

### `SdResizeEvent`

```typescript
interface SdResizeEvent {
  heightChanged: boolean;
  widthChanged: boolean;
  target: Element;
  contentRect: DOMRectReadOnly;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `heightChanged` | `boolean` | 높이 변경 여부 |
| `widthChanged` | `boolean` | 너비 변경 여부 |
| `target` | `Element` | 대상 요소 |
| `contentRect` | `DOMRectReadOnly` | 컨텐츠 영역 크기 |

### `SdIntersectionEventPlugin`

IntersectionObserver 기반 이벤트. 이벤트명: `sdIntersection`

```typescript
class SdIntersectionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean; // eventName === "sdIntersection"
}
```

### `SdIntersectionEvent`

```typescript
interface SdIntersectionEvent {
  entry: IntersectionObserverEntry;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `entry` | `IntersectionObserverEntry` | 마지막 IntersectionObserver 엔트리 |

## Option Plugin

### `SdOptionEventPlugin`

`.capture`, `.passive`, `.once` 이벤트 수식어 플러그인. 네이티브 DOM 이벤트에 addEventListener options를 적용한다.

```typescript
class SdOptionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean; // /\.(capture|passive|once)/ 매칭
}
```

사용법: `(scroll.passive)="onScroll($event)"`, `(click.capture.once)="onClick($event)"`

## Error Handler

### `SdGlobalErrorHandlerPlugin`

글로벌 에러 핸들러. Angular의 `ErrorHandler`를 구현하여 PromiseRejectionEvent, ErrorEvent, Error 등을 처리한다.

```typescript
class SdGlobalErrorHandlerPlugin implements ErrorHandler {
  handleError(event: any): false;
}
```

에러 발생 시:
1. `SdSystemLogProvider.writeAsync()`로 로그 기록
2. 전체 화면 에러 메시지 표시 (검은 배경 + 흰 텍스트)
3. `ApplicationRef.destroy()` 호출하여 앱 정지
4. 클릭 시 페이지 리로드 (프로덕션에서는 `location.hash = "/"` 후 리로드)
