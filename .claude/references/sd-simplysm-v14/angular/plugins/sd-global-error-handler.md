# `SdGlobalErrorHandlerPlugin`

글로벌 에러 핸들러. Angular `ErrorHandler`를 구현하여 처리되지 않은 에러를 포착하고 화면에 표시한다.

```typescript
@Injectable({ providedIn: null })
export class SdGlobalErrorHandlerPlugin implements ErrorHandler
```

`provideSdAngular()`에 의해 자동 등록된다. 직접 등록할 필요 없다.

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `handleError(event)` | method | `(any) => void` | 에러 처리. `PromiseRejectionEvent`, `ErrorEvent`, `Error` 등을 구분하여 처리 |

## 동작

- `PromiseRejectionEvent` → reason이 `Error`면 메시지+스택, 객체면 JSON 표시
- `ErrorEvent` → error가 `Error`면 메시지+스택, string이면 그대로 표시
- `Error` → 메시지+스택 표시
- devMode에서는 toast로, prodMode에서는 alert로 표시 (중복 표시 방지)
