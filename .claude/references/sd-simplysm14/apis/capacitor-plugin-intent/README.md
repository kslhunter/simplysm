# @simplysm/capacitor-plugin-intent

Android 인텐트(브로드캐스트 송수신, 실행 인텐트 조회, startActivityForResult) Capacitor 플러그인. 산업용 디바이스 연동(바코드 스캐너, PDA 등) 용도. 웹 환경에서는 no-op + 경고 로그.

## 사용 트리거 인덱스
- **`Intent.subscribe` / `Intent.unsubscribeAll`** — 특정 액션 브로드캐스트 수신.
- **`Intent.send`** — 외부 앱에 브로드캐스트 송신(예: DataWedge 트리거).
- **`Intent.getLaunchIntent`** — 앱이 인텐트로 기동될 때 초기 데이터 조회.
- **`Intent.addListener("newIntent", ...)` / `Intent.removeAllListeners`** — 앱 실행 중 새 인텐트 수신.
- **`Intent.startActivityForResult`** — 외부 Activity 실행 후 결과 수신(결제·인증 모듈 등).
- **`IntentResult` / `StartActivityForResultOptions` / `StartActivityForResultResult`** — 타입 정의.

## Intent (abstract class, static only)

### `subscribe(filters, callback) → Promise<() => Promise<void>>`
`filters`: 수신할 action 문자열 배열. `callback`: 매 수신마다 호출. 반환값은 구독 해제 함수.
```ts
const unsub = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => console.log(result.extras),
);
await unsub();
```

### `unsubscribeAll() → Promise<void>`
프로세스 내 모든 `subscribe` 구독 해제.

### `send({ action, extras? }) → Promise<void>`
브로드캐스트 송신.
```ts
await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: { "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING" },
});
```

### `getLaunchIntent() → Promise<IntentResult>`
현재 앱을 실행시킨 인텐트의 action/extras 조회. 웹은 `{}` 반환.

### `addListener("newIntent", callback) → Promise<PluginListenerHandle>`
앱 실행 중 수신되는 새 인텐트(`onNewIntent`)에 대한 리스너 등록. `handle.remove()` 로 개별 해제.

### `removeAllListeners() → Promise<void>`
`addListener` 로 등록된 모든 리스너 제거.

### `startActivityForResult(options) → Promise<StartActivityForResultResult>`
외부 Activity 실행 후 결과 수신. `resultCode === -1` 이 `RESULT_OK`.
```ts
const result = await Intent.startActivityForResult({
  action: "com.example.PAY",
  extras: { amount: 1000 },
});
if (result.resultCode === -1) { /* OK */ }
```

## 타입

### `IntentResult`
- `action?: string` — 브로드캐스트 액션.
- `extras?: Record<string, unknown>` — 추가 데이터.

### `StartActivityForResultOptions`
- `action?: string`
- `uri?: string`
- `extras?: Record<string, unknown>`
- `type?: string` — MIME type.
- `packageName?: string` — 특정 앱 지정.
- `className?: string` — 특정 Activity 지정.
- `flags?: number` — Intent flags.

### `StartActivityForResultResult`
- `resultCode: number` — Android `RESULT_*` 코드 (`-1` = OK, `0` = CANCELED).
- `data?: { action?: string; uri?: string; extras?: Record<string, unknown> }`

### `IntentPlugin`
저수준 Capacitor 플러그인 인터페이스. 일반적으로 직접 사용하지 않고 `Intent` static API 사용. 커스텀 래핑이 필요할 때만 참조.

## 플랫폼 동작
- Android: 네이티브 구현.
- Web: 모든 변경 메서드(`subscribe`/`send`/`startActivityForResult`)는 `console.warn` 후 stub 값 반환. `getLaunchIntent`/`unsubscribe*` 는 조용히 no-op.
