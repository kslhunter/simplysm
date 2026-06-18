# @simplysm/capacitor-plugin-intent

Android 인텐트 연동 Capacitor 플러그인. 정적 클래스 `Intent` 로 브로드캐스트 송수신, 실행 인텐트 조회, `newIntent` 리스닝, `startActivityForResult` 외부 Activity 실행을 수행. 산업용 디바이스(바코드 스캐너, PDA 등) 연동용. 웹 환경(`IntentWeb` 스텁)에서는 실제 동작 없이 경고 로그만 남기고 무해한 기본값을 반환하므로 인텐트 처리는 Android 네이티브에서만 일어난다.

## 사용 트리거 인덱스

- 브로드캐스트 수신/전송, 실행 인텐트 조회, `newIntent` 리스닝, `startActivityForResult` → `Intent` 정적 클래스 (아래 인라인).
- 콜백 인자·옵션·결과 타입 → `IntentResult` / `StartActivityForResultOptions` / `StartActivityForResultResult` (아래 인라인).
- 네이티브 플러그인 저수준 계약 → `IntentPlugin` (아래 인라인, 보통 직접 호출하지 않음).

## Intent 정적 클래스

`abstract class Intent` — 인스턴스화 불가, `Intent.xxx()` 형태로만 호출. 모든 메서드 비동기. 내부적으로 `registerPlugin<IntentPlugin>("Intent")` 로 얻은 플러그인(웹은 `IntentWeb`)을 래핑.

```ts
Intent.subscribe(filters: string[], callback: (result: IntentResult) => void): Promise<() => Promise<void>>
Intent.unsubscribeAll(): Promise<void>
Intent.send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>
Intent.getLaunchIntent(): Promise<IntentResult>
Intent.addListener(eventName: "newIntent", callback: (result: IntentResult) => void): Promise<PluginListenerHandle>
Intent.removeAllListeners(): Promise<void>
Intent.startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>
```

- `subscribe(filters, callback)`: `filters` 의 액션 문자열들에 대한 브로드캐스트 수신기 등록. `callback` 은 `result.action != null` 인 실제 수신 시점에만 호출됨(등록 직후 `{ id }` 만 담긴 초기 resolve 는 내부에서 걸러짐). 반환값은 구독 해제 함수이며, 호출 시 내부 `id` 로 해당 구독만 해제. 스캐너 결과 액션 수신 등 화면 진입 시 등록·이탈 시 해제 용도.
- `unsubscribeAll()`: 등록된 모든 브로드캐스트 수신기를 일괄 해제. 개별 해제 함수를 보관하지 않고 전역 정리할 때.
- `send(options)`: `options.action` 액션으로 브로드캐스트 전송, `options.extras` 로 추가 데이터 동봉. 스캐너 트리거 토글 등 디바이스 제어 명령 송신에 사용.
- `getLaunchIntent()`: 앱을 실행시킨 인텐트(`action`·`extras`)를 `IntentResult` 로 조회. 외부 인텐트로 앱이 기동됐는지·그 데이터를 시작 시점에 읽을 때. 웹 스텁은 항상 빈 객체 `{}` 반환.
- `addListener("newIntent", callback)`: 앱 실행 중 새로 도착하는 인텐트를 리스닝. `eventName` 은 `"newIntent"` 리터럴 고정. 반환된 `PluginListenerHandle` 의 `handle.remove()` 로 이 리스너만 개별 해제. `subscribe`(브로드캐스트)와는 별개 채널.
- `removeAllListeners()`: `addListener` 로 등록한 모든 이벤트 리스너를 일괄 제거.
- `startActivityForResult(options)`: 외부 Activity 를 실행하고 결과 코드·데이터를 `await` 로 직접 수신. 결제 앱·이미지 선택기 등 결과를 되받는 외부 화면 호출에 사용. 반환 `resultCode` 로 성공 판정(Android 규약상 `-1` = RESULT_OK, `0` = RESULT_CANCELED).

```ts
// 브로드캐스트 수신 (DataWedge 결과 액션)
const unsub = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => console.log(result.action, result.extras),
);

// 스캔 트리거 토글 전송
await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: { "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING" },
});

// 외부 Activity 실행 후 결과 수신
const res = await Intent.startActivityForResult({ action: "com.example.PAY", extras: { amount: 1000 } });
if (res.resultCode === -1) { /* RESULT_OK */ }

await unsub(); // 개별 구독 해제
```

웹 플랫폼(`IntentWeb`)에서는 `subscribe`·`send`·`startActivityForResult` 가 실제 동작 없이 경고 로그(`createLogger("capacitor:intent")` → `"웹 환경에서는 지원하지 않습니다."`)만 남긴다. 이때 `subscribe` 는 `{ id: "web-stub" }`(콜백 미호출), `getLaunchIntent` 는 경고 없이 `{}`, `startActivityForResult` 는 `{ resultCode: 0 }`(항상 CANCELED 로 보임)을 반환하고, `unsubscribe`·`unsubscribeAll` 은 무동작. 호출해도 예외는 나지 않으나 인텐트 동작은 Android 에서만 발생함을 전제로 작성할 것.

## 타입

`Intent` 메서드의 콜백 인자·옵션·결과를 다루는 인터페이스. "값 없음"은 그대로 `undefined` 로 전달되므로 호출부에서 optional 로 다룰 것.

```ts
interface IntentResult {
  action?: string;
  extras?: Record<string, unknown>;
}

interface StartActivityForResultOptions {
  action?: string;
  uri?: string;
  extras?: Record<string, unknown>;
  type?: string;
  packageName?: string;
  className?: string;
  flags?: number;
}

interface StartActivityForResultResult {
  resultCode: number;
  data?: { action?: string; uri?: string; extras?: Record<string, unknown> };
}
```

- `IntentResult.action`: 인텐트(브로드캐스트) 액션 문자열. 미수신/미설정일 수 있어 선택. `subscribe` 콜백에는 이 값이 채워진 실제 이벤트만 전달됨.
- `IntentResult.extras`: 인텐트에 담긴 추가 키-값 데이터(스캔된 바코드 값 등). 없을 수 있음.
- `StartActivityForResultOptions.action`: 인텐트 액션. 암시적 인텐트로 처리 앱을 띄울 때.
- `StartActivityForResultOptions.uri`: 인텐트 data URI. URI 로 대상(뷰어·다이얼러 등)을 지정할 때.
- `StartActivityForResultOptions.extras`: 대상 Activity 로 전달할 추가 키-값 데이터(호출 파라미터).
- `StartActivityForResultOptions.type`: MIME 타입(예: `"image/*"`). 데이터 형식으로 처리 대상을 좁힐 때.
- `StartActivityForResultOptions.packageName`: 실행할 특정 앱 패키지명. 명시적으로 특정 앱만 실행할 때.
- `StartActivityForResultOptions.className`: 실행할 특정 Activity 클래스명. `packageName` 과 함께 컴포넌트를 직접 지정할 때.
- `StartActivityForResultOptions.flags`: Android Intent flags 비트값(정수). 실행 모드 제어가 필요할 때.
- `StartActivityForResultResult.resultCode`: Activity 결과 코드(필수). `-1` = RESULT_OK, `0` = RESULT_CANCELED. 성공/취소 분기 판단에 사용(웹 스텁은 항상 `0`).
- `StartActivityForResultResult.data`: 결과 인텐트 데이터(선택, 결과 없으면 부재). `action` = 결과 인텐트 액션, `uri` = 결과 data URI, `extras` = 결과 추가 데이터. 결과 본문은 `data?.extras` 로 접근.

## IntentPlugin

`interface IntentPlugin` — `registerPlugin<IntentPlugin>("Intent")` 에 쓰이는 Capacitor 네이티브 플러그인 계약. 웹 구현(`IntentWeb`)과 Android 네이티브가 구현. 일반 코드는 `Intent` 정적 메서드를 쓰고 이 인터페이스를 직접 호출하지 않으며, 네이티브 구현·웹 스텁의 저수준 계약 확인용으로만 참조.

```ts
subscribe(options: { filters: string[] }, callback: (result: IntentResult) => void): Promise<{ id: string }>
unsubscribe(options: { id: string }): Promise<void>
unsubscribeAll(): Promise<void>
send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>
getLaunchIntent(): Promise<IntentResult>
addListener(eventName: "newIntent", listenerFunc: (data: IntentResult) => void): Promise<PluginListenerHandle>
removeAllListeners(): Promise<void>
startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>
```

- `subscribe`: 수신기 등록 후 해제용 `id` 반환. `Intent.subscribe` 가 이 `id` 를 클로저로 보관해 반환 함수에서 `unsubscribe` 에 넘김.
- `unsubscribe`: 주어진 `id` 의 수신기만 해제. 단일 구독 해제는 이 인터페이스에만 있고, `Intent` 클래스에서는 `subscribe` 가 돌려주는 해제 함수로 대체됨.
- 그 외(`unsubscribeAll`·`send`·`getLaunchIntent`·`addListener`·`removeAllListeners`·`startActivityForResult`)는 동명의 `Intent` 정적 메서드와 동일 동작의 계약.
