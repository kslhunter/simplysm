# `SdOptionEventPlugin`

`.capture`, `.passive`, `.once` 이벤트 수식어 플러그인. 네이티브 DOM 이벤트에 addEventListener options를 적용한다. [`provideSdAngular`](../bootstrap/provide-sd-angular.md)에서 자동 등록된다.

```typescript
class SdOptionEventPlugin extends EventManagerPlugin {
  supports(eventName: string): boolean; // /\.(capture|passive|once)/ 매칭
}
```

## Usage

```html
<div (scroll.passive)="onScroll($event)">...</div>
<div (click.capture.once)="onClick($event)">...</div>
```

## Related Types

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
