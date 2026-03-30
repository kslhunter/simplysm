# Commons & Configuration

## `provideSdAngular`

Bootstrap function that registers all core providers, event plugins, the global error handler, and zoneless change detection. Call in `bootstrapApplication`.

```typescript
function provideSdAngular(opt: { clientName: string }): EnvironmentProviders
```

Registers:
- `SdAngularConfigProvider` with the given `clientName`
- `SdThemeProvider` with dark mode persistence via `SdLocalStorageProvider`
- All event manager plugins (`SdSaveCommandEventPlugin`, `SdRefreshCommandEventPlugin`, `SdInsertCommandEventPlugin`, `SdResizeEventPlugin`, `SdIntersectionEventPlugin`, `SdOptionEventPlugin`)
- `SdGlobalErrorHandlerPlugin` as `ErrorHandler`
- `provideZonelessChangeDetection()`
- Global unhandled rejection/error listeners
- Service Worker update polling (5-minute interval)
- Router navigation busy indicator

## `TXT_CHANGE_IGNORE_CONFIRM`

Confirmation message text displayed when the user attempts to navigate away with unsaved changes.

```typescript
const TXT_CHANGE_IGNORE_CONFIRM: string
```

Value (Korean):
```
변경사항이 있습니다. 모든 변경사항을 무시하시겠습니까?
- 확인: 변경사항을 무시하고, 현재 요청한 작업을 수행
- 취소: 현재 요청한 작업을 취소하고, 변경사항 재검토
```
