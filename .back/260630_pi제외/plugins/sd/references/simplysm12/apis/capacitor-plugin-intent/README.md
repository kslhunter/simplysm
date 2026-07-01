# @simplysm/capacitor-plugin-intent

Android Intent 송수신 Capacitor 플러그인. 산업용 장치(바코드 스캐너, PDA 등) 연동용. 웹 환경에서는 미지원(alert 후 stub 반환).

## 사용 트리거 인덱스

- **Intent** — Android Intent 를 수신 등록/전송/Activity 결과 수신할 때 쓰는 정적 클래스. 바코드 스캐너 등 외부 장치 broadcast 연동의 진입점.
- **IIntentResult** — `subscribe` 콜백 인자 및 `getLaunchIntent` 반환에 담기는 수신 Intent 데이터 형태.
- **IStartActivityForResultOptions / IActivityResult** — `startActivityForResult` 호출 옵션과 반환 결과 형태.

## Intent (정적 클래스)

`abstract class Intent` — 모든 메서드 static. 내부적으로 `registerPlugin("Intent")` 한 Capacitor 플러그인에 위임.

- `static subscribe(filters: string[], callback: (result: IIntentResult) => void): Promise<() => Promise<void>>`
  - `filters` — 수신할 Intent action 문자열 배열. 예: `["com.symbol.datawedge.api.RESULT_ACTION"]`. 이 action 들에 해당하는 Intent 가 들어오면 콜백 호출.
  - `callback` — 매칭 Intent 수신 시 호출. 인자는 `IIntentResult`.
  - 반환값 — 해제 함수. `await unsub()` 호출 시 해당 구독만 해제(내부적으로 `id` 기반 `unsubscribe`).
- `static unsubscribeAll(): Promise<void>` — 등록된 모든 Intent 수신기 해제. 개별 해제 함수 없이 일괄 정리할 때.
- `static send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>` — Intent broadcast 전송.
  - `action` — 전송할 Intent action 문자열(필수).
  - `extras` — 함께 실어 보낼 키-값 데이터(선택).
- `static getLaunchIntent(): Promise<IIntentResult>` — 앱을 시작시킨 Intent 를 조회. 외부 장치/딥링크가 앱을 띄운 경우 그 action/extras 확인용. 웹에서는 빈 객체 `{}` 반환.
- `static startActivityForResult(options: IStartActivityForResultOptions): Promise<IActivityResult>` — Activity 를 띄우고 그 결과를 await 로 수신.

웹 환경 동작(IntentWeb stub): `subscribe`·`send`·`startActivityForResult` 는 `alert("[Intent] 웹 환경에서는 ... 지원하지 않습니다.")` 후 — `subscribe` 는 `{ id: "web-stub" }`, `send` 는 무동작, `startActivityForResult` 는 `{ resultCode: 0 }`(취소 취급) 반환. `getLaunchIntent` 는 `{}`, `unsubscribe`/`unsubscribeAll` 은 무동작.

## 데이터 형태

### IIntentResult
`subscribe` 콜백 인자, `getLaunchIntent` 반환 형태.
- `action?: string` — 수신된 Intent 의 action 문자열.
- `extras?: Record<string, unknown>` — Intent 에 담긴 추가 데이터(스캔 결과 등이 들어옴).

### IStartActivityForResultOptions
`startActivityForResult` 옵션.
- `action: string` — 시작할 Intent action(필수). 예: `"android.intent.action.GET_CONTENT"`.
- `uri?: string` — 데이터 URI.
- `extras?: Record<string, unknown>` — 추가 데이터.
- `package?: string` — 대상 패키지명(특정 앱 지정).
- `component?: string` — 대상 컴포넌트(Activity) 클래스명.
- `type?: string` — MIME 타입. 예: `"image/*"`.

### IActivityResult
`startActivityForResult` 반환 형태.
- `resultCode: number` — Activity 결과 코드. `-1` = RESULT_OK(성공), `0` = RESULT_CANCELED(취소). 성공 판정은 `resultCode === -1` 로.
- `data?: string` — 결과 데이터 URI.
- `extras?: Record<string, unknown>` — 결과 추가 데이터.

## 사용 예

```ts
// 바코드 스캐너 수신 등록 → 해제
const unsub = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => console.log(result.extras),
);
unsub(); // 개별 해제 (또는 Intent.unsubscribeAll())

// Intent 전송
await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: { "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING" },
});

// Activity 결과 수신
const result = await Intent.startActivityForResult({
  action: "android.intent.action.GET_CONTENT",
  type: "image/*",
});
if (result.resultCode === -1) console.log("Selected:", result.data); // RESULT_OK
```
