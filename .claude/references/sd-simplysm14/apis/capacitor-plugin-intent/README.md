# @simplysm/capacitor-plugin-intent

Android 인텐트 송수신·외부 Activity 실행용 Capacitor 플러그인. 산업용 디바이스 연동(바코드 스캐너·PDA 등). 웹은 stub(경고 로그 + no-op).

## 사용 트리거 인덱스

- **`Intent.subscribe` / `Intent.unsubscribeAll`** — 외부 앱이 보내는 브로드캐스트 액션을 앱에서 수신할 때 (스캐너 RESULT 등).
- **`Intent.send`** — 외부 앱(DataWedge 등)에 브로드캐스트 명령을 송신할 때.
- **`Intent.getLaunchIntent`** — 앱을 기동시킨 인텐트의 action/extras 를 읽을 때.
- **`Intent.addListener("newIntent", …)` / `Intent.removeAllListeners`** — 이미 실행 중인 앱에 들어오는 새 인텐트를 받을 때 (`singleTask`/`singleTop` launchMode 필요).
- **`Intent.startActivityForResult`** — 외부 Activity 를 실행하고 결과 코드/데이터를 받을 때 (결제·인증 모듈 등).

## `Intent` (abstract class, static only)

`new` 금지, 정적 메서드만 호출.

### `subscribe(filters, callback): Promise<() => Promise<void>>`

- `filters: string[]` — 수신할 Intent action 문자열 배열.
- `callback: (result: IntentResult) => void` — 매 수신마다 호출. 등록 직후의 빈 resolve(`action == null`)는 내부 필터로 콜백 호출 X.
- 반환: 해당 구독만 해제하는 함수.

```ts
const unsub = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (r) => console.log(r.extras),
);
await unsub();
```

### `unsubscribeAll(): Promise<void>`

`subscribe` 로 등록된 모든 수신기 해제.

### `send({ action, extras? }): Promise<void>`

- `action: string` — 송신할 브로드캐스트 action.
- `extras?: Record<string, unknown>` — 함께 보낼 키/값.

```ts
await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: { "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING" },
});
```

### `getLaunchIntent(): Promise<IntentResult>`

앱을 기동시킨 인텐트의 action/extras 반환. 웹은 `{}`.

### `addListener("newIntent", callback): Promise<PluginListenerHandle>`

- `eventName: "newIntent"` — 고정 리터럴. Android `onNewIntent` 수신 시점에 호출.
- 반환 핸들의 `handle.remove()` 로 개별 해제.

### `removeAllListeners(): Promise<void>`

`addListener` 등록 전체 제거.

### `startActivityForResult(options): Promise<StartActivityForResultResult>`

`StartActivityForResultOptions` (모두 선택, 최소 1개로 대상 결정):

- `action?: string` — Intent action.
- `uri?: string` — `setData()` URI.
- `extras?: Record<string, unknown>` — 전달 extras.
- `type?: string` — MIME type (`setType()`).
- `packageName?: string` — 대상 앱 패키지 한정.
- `className?: string` — 대상 Activity FQCN 한정.
- `flags?: number` — Intent flags 비트마스크 (Android `Intent.FLAG_*`).

반환 `StartActivityForResultResult`:

- `resultCode: number` — Android 결과 코드. `-1` = `RESULT_OK`, `0` = `RESULT_CANCELED`, 그 외 앱 정의 값.
- `data?: { action?, uri?, extras? }` — 결과 Intent 의 action/uri/extras.

```ts
const r = await Intent.startActivityForResult({ action: "com.example.PAY", extras: { amount: 1000 } });
if (r.resultCode === -1) { /* OK */ }
```

## 타입

- `IntentResult { action?: string; extras?: Record<string, unknown> }` — 수신/조회 결과 공통 형태.
- `StartActivityForResultOptions` / `StartActivityForResultResult` — 위 메서드 시그니처 참조.
- `IntentPlugin` — Capacitor `registerPlugin` 용 저수준 인터페이스. 커스텀 래핑이 필요할 때만 참조, 일반 사용은 `Intent` static API.

## 플랫폼 동작

- Android: 네이티브 구현.
- Web(`IntentWeb`): `subscribe`/`send`/`startActivityForResult` 는 `consola.withTag("capacitor:intent").warn("웹 환경에서는 지원하지 않습니다.")` 후 stub 반환 (`subscribe` → `{ id: "web-stub" }`, `startActivityForResult` → `{ resultCode: 0 }`, `send` → void). `getLaunchIntent` 는 `{}`, `unsubscribe`/`unsubscribeAll` 은 조용히 no-op.
