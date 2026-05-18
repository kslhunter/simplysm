# @simplysm/angular — infrastructure

앱 인프라 프로바이더(전부 `providedIn: "root"` 또는 single instance).

## `SdServiceClientFactoryProvider`

`@simplysm/service-client` 의 `ServiceClient` 를 키별로 보관.

```typescript
const factory = inject(SdServiceClientFactoryProvider);
await factory.connectAsync("main", { host, port, ssl });   // 옵션 생략 시 location 기반
const client = factory.get("main");
await factory.closeAsync("main");
```

- 같은 키 재연결 금지(`이미 연결된`/`이미 연결이 끊긴`). 한 번 close된 키는 재사용 불가.
- request/response progress → `SdToastProvider.info(message, true)` 로 진행률 토스트 자동.
- destroy 시 모든 클라이언트 close.

## `SdFileDialogProvider`

```typescript
const file  = await inject(SdFileDialogProvider).showAsync();
const files = await inject(SdFileDialogProvider).showAsync(true, "image/*");
```

cancel/empty → `undefined`. 동적 `<input type=file>` 생성/제거.

## `SdLocalStorageProvider<T>`

```typescript
const ls = inject<SdLocalStorageProvider<Schema>>(SdLocalStorageProvider);
ls.set("theme", "dark");
const v = ls.get("theme");
ls.remove("theme");
```

키는 `<clientName>.<key>` 로 prefix. JSON 직렬화.

## `SdSystemConfigProvider<T>`

```typescript
const cfg = inject<SdSystemConfigProvider<Schema>>(SdSystemConfigProvider);
cfg.fn = { set: (k, v) => svc.set(k, v), get: (k) => svc.get(k) };  // 옵션: 서버 연동
await cfg.setAsync("sheet.order", config);
const v = await cfg.getAsync("sheet.order");
```

`fn` 미설정이면 `SdLocalStorageProvider` 폴백. SdSheet/SdModal/SdStatePreset 등이 자동 사용.

## `injectSdSystemConfigResource<T>({ key })`

```typescript
const r = injectSdSystemConfigResource<MyConfig>({ key: keySignal });
r.value(); r.isLoading(); r.status();
r.set(v); r.update((prev) => ...); r.reload(); r.hasValue();
```

키는 `<elementTagName>.<key()>` 로 prefix. set 호출 시 화면 즉시 갱신 + queueMicrotask 로 비동기 영속화 (실패 시 ErrorHandler).

## `SdGlobalErrorHandlerPlugin`

`provideSdAngular`가 `ErrorHandler` 로 등록. 처리되지 않은 Error/PromiseRejectionEvent/ErrorEvent 캐치 → `SdSystemLogProvider.writeAsync("error", ...)` + 전면 오버레이 + ApplicationRef destroy. 클릭 시 reload(prod는 hash `/` 로 리셋).

## `SdOptionEventPlugin`

`provideSdAngular`가 `EVENT_MANAGER_PLUGINS` 로 등록. 이벤트명에 `.capture` / `.passive` / `.once` 접미 허용 (예: `(scroll.passive)`, `(click.capture.once)`).

## `SdPrintProvider`

```typescript
await print.printAsync({ type: MyTpl, inputs: { ... } }, { size: "A4", margin: "0" });
const bytes = await print.getPdfBufferAsync({ type, inputs }, { orientation: "portrait", pageSize: "a4" });
```

- 템플릿 컴포넌트는 `SdPrint` 구현 필요 (`initialized: Signal<boolean>`, optional `_optionalPrintInputs`).
- `SdPrintInput<T, X>` = `{ type; inputs: WithOptional<DirectiveInputSignals<T> 제외..., optional 키들> }`.
- print: `@page` + `@media print` 스타일 임시 주입 → `initialized=true` 및 이미지 로드 대기 → `window.print()`.
- PDF: `.page` 자식이 있으면 페이지별, 없으면 단일 페이지. `htmlToImage.toCanvas` (pixelRatio=4) → `jspdf.addImage`.
- 두 메서드 모두 진행 동안 `SdBusyProvider.globalBusyCount` ±1.
