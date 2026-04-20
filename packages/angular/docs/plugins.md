# Plugins

Angular의 `EventManagerPlugin`을 확장하여 커스텀 이벤트 옵션을 지원한다. `provideSdAngular()`에서 `SdOptionEventPlugin`만 자동 등록된다.

> **NOTE:** 이전 버전의 커맨드 플러그인(`sdSaveCommand`, `sdRefreshCommand`, `sdInsertCommand`)과 옵저버 플러그인(`sdResize`, `sdIntersection`)은 디렉티브로 대체되었다. 자세한 내용은 [directives.md](./directives.md)의 `SdCommandDirective`, `SdResizeDirective`, `SdIntersectionDirective` 항목을 참고한다.

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
