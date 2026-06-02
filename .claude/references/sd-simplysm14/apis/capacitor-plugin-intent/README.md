# @simplysm/capacitor-plugin-intent

Android 인텐트 송수신 Capacitor 플러그인. 브로드캐스트 수신/전송, 실행 인텐트 조회, `startActivityForResult` 외부 Activity 실행·결과 수신을 제공하며 바코드 스캐너·PDA 등 산업용 디바이스 연동에 사용. 웹 환경에서는 미지원 스텁(`IntentWeb`)이 경고 로그 후 빈/스텁 결과를 반환하므로 실제 인텐트 처리는 Android 디바이스에서만 일어남.

## 사용 트리거 인덱스

- **Intent** — 인텐트 작업의 정적 진입점. 브로드캐스트 구독/전송, 실행 인텐트 조회, newIntent 리스너, 외부 Activity 실행을 할 때. 아래 인라인 섹션 참조.
- **IntentResult / StartActivityForResultOptions / StartActivityForResultResult** — `Intent` 메서드의 입출력 타입. 콜백 결과·실행 옵션·반환값을 타입으로 다룰 때. 아래 인라인 섹션 참조.
- **IntentPlugin** — `registerPlugin` 에 쓰이는 Capacitor 네이티브 플러그인 계약. 보통 직접 호출하지 않고 `Intent` 정적 메서드를 거치며, 웹 스텁·네이티브 구현의 저수준 계약 확인용. 아래 인라인 섹션 참조.

## Intent (정적 클래스)

`abstract class Intent` — 정적 메서드만 가진 진입점. 인스턴스화하지 않고 `Intent.xxx()` 형태로 호출하며 모든 메서드는 비동기(`Promise`). 내부적으로 `registerPlugin<IntentPlugin>("Intent")` 로 얻은 플러그인(웹은 `IntentWeb`)을 래핑.

- `Intent.subscribe(filters: string[], callback: (result: IntentResult) => void): Promise<() => Promise<void>>` — 브로드캐스트 수신기 등록. `filters` = 수신할 인텐트 액션 문자열 배열(예: `"com.symbol.datawedge.api.RESULT_ACTION"`). `callback` = 매칭 브로드캐스트 도착 시 호출되며, 등록 직후 플러그인이 보내는 `{ id }` 만 담긴 초기 resolve(`result.action == null`)는 내부에서 걸러져 호출되지 않음. 반환값은 구독 해제 함수로, 호출 시 내부 `id` 로 해당 수신기만 해제. 스캐너 등 지속 수신 화면 진입 시 등록하고 이탈 시 반환 함수로 해제하는 용도.
- `Intent.unsubscribeAll(): Promise<void>` — 등록된 모든 브로드캐스트 수신기를 한 번에 해제. 개별 해제 함수를 보관하지 않았거나 화면 정리 시 전체를 정리할 때.
- `Intent.send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>` — 브로드캐스트 전송. `action`(필수) = 전송할 인텐트 액션 문자열, `extras`(선택, 미지정 가능) = 함께 보낼 추가 키-값 데이터. 스캐너 트리거 토글 등 디바이스에 명령을 보낼 때.
- `Intent.getLaunchIntent(): Promise<IntentResult>` — 앱을 실행시킨 인텐트 조회. 외부 인텐트로 앱이 기동됐는지·그 `extras` 를 앱 시작 시점에 읽을 때. 웹 스텁은 항상 빈 객체 `{}` 반환.
- `Intent.addListener(eventName: "newIntent", callback: (result: IntentResult) => void): Promise<PluginListenerHandle>` — 앱 실행 중 새로 들어오는 인텐트 리스너 등록. `eventName` 은 `"newIntent"` 리터럴 고정(이미 떠 있는 앱에 인텐트가 재전달되는 singleTop 등 상황에서 발생). 반환 핸들의 `handle.remove()` 로 개별 해제.
- `Intent.removeAllListeners(): Promise<void>` — `addListener` 로 등록한 모든 이벤트 리스너를 일괄 제거. 화면 정리 시 newIntent 리스너를 한 번에 해제할 때.
- `Intent.startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>` — 외부 Activity 를 실행하고 결과를 수신. 결제·서명 등 외부 앱에 작업을 위임하고 응답을 되받아야 할 때. 반환 `resultCode` 로 성공 판정(Android 규약상 `-1` = RESULT_OK, `0` = RESULT_CANCELED).

사용 예:

```ts
const unsub = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => console.log(result.action, result.extras),
);
await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: { "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING" },
});
const res = await Intent.startActivityForResult({ action: "com.example.PAY", extras: { amount: 1000 } });
if (res.resultCode === -1) { /* RESULT_OK */ }
await unsub(); // 개별 해제
```

주의: 웹 플랫폼(`IntentWeb`)에서는 `subscribe`·`send`·`startActivityForResult` 가 실제 동작 없이 경고 로그(`createLogger("capacitor:intent")` → `"웹 환경에서는 지원하지 않습니다."`)만 남긴다. 이때 `subscribe` 는 `{ id: "web-stub" }`(콜백 미호출), `getLaunchIntent` 는 `{}`, `startActivityForResult` 는 `{ resultCode: 0 }`(항상 CANCELED 로 보임)을 반환하고, `unsubscribe`·`unsubscribeAll` 은 무동작.

## 입출력 타입

`Intent` 메서드의 결과·옵션을 타입으로 다룰 때 참조하는 인터페이스.

- `IntentResult` — `subscribe`·`addListener` 콜백 인자 및 `getLaunchIntent` 반환 타입.
  - `action?: string` — 인텐트(브로드캐스트) 액션 문자열. 미수신/미설정일 수 있어 선택. `subscribe` 콜백에는 이 값이 채워진 실제 이벤트만 전달됨(초기 resolve 구분 기준).
  - `extras?: Record<string, unknown>` — 인텐트에 담긴 추가 키-값 데이터(스캔된 바코드 값 등). 없을 수 있음.
- `StartActivityForResultOptions` — `startActivityForResult` 입력. 모든 필드 선택이며 대상 인텐트를 암시적(액션·URI·타입) 또는 명시적(패키지·클래스)으로 구성.
  - `action?: string` — 인텐트 액션. 암시적 인텐트로 대상을 지정할 때.
  - `uri?: string` — 인텐트 data URI. URI 로 대상(뷰어·다이얼러 등)을 지정할 때.
  - `extras?: Record<string, unknown>` — 대상 Activity 로 전달할 추가 키-값 데이터.
  - `type?: string` — MIME 타입. 데이터 형식으로 처리 대상 앱을 좁힐 때.
  - `packageName?: string` — 실행할 특정 앱 패키지명. 명시적 인텐트화(특정 앱으로만 실행)할 때.
  - `className?: string` — 실행할 특정 Activity 클래스명. `packageName` 과 함께 컴포넌트를 직접 지정할 때.
  - `flags?: number` — Android Intent flags 비트값. 실행 모드(새 태스크 시작 등) 제어가 필요할 때.
- `StartActivityForResultResult` — `startActivityForResult` 반환.
  - `resultCode: number` — Activity 결과 코드. Android 규약상 `-1` = RESULT_OK, `0` = RESULT_CANCELED. 성공 분기 판단에 사용(웹 스텁은 `0`).
  - `data?: { action?: string; uri?: string; extras?: Record<string, unknown> }` — 결과 인텐트 데이터. `action` = 결과 인텐트 액션, `uri` = 결과 data URI, `extras` = 결과 추가 데이터. 취소 등으로 데이터가 없으면 부재.

## IntentPlugin

`interface IntentPlugin` — `registerPlugin<IntentPlugin>("Intent")` 에 쓰이는 Capacitor 네이티브 플러그인 계약. 웹 구현(`IntentWeb`)과 Android 네이티브가 이를 구현. 일반 사용 코드는 `Intent` 정적 메서드를 쓰고 이 인터페이스를 직접 호출하지 않으며, 네이티브 구현·웹 스텁이 충족해야 할 저수준 계약을 확인할 때만 참조.

- `subscribe(options: { filters: string[] }, callback: (result: IntentResult) => void): Promise<{ id: string }>` — 수신기 등록 후 해제용 `id` 반환. `Intent.subscribe` 가 이 `id` 를 클로저로 보관해 반환 함수에서 `unsubscribe` 에 넘김.
- `unsubscribe(options: { id: string }): Promise<void>` — 주어진 `id` 의 수신기만 해제.
- `unsubscribeAll(): Promise<void>` — 모든 수신기 해제.
- `send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>` — 브로드캐스트 전송.
- `getLaunchIntent(): Promise<IntentResult>` — 실행 인텐트 조회.
- `addListener(eventName: "newIntent", listenerFunc: (data: IntentResult) => void): Promise<PluginListenerHandle>` — `"newIntent"` 이벤트 리스너 등록, 해제용 표준 Capacitor 핸들 반환.
- `removeAllListeners(): Promise<void>` — 모든 리스너 제거.
- `startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>` — 외부 Activity 실행 및 결과 수신.
