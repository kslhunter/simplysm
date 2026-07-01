# @simplysm/capacitor-plugin-intent

Android 인텐트 브로드캐스트 송수신, 앱 실행 인텐트 조회, 실행 중 수신되는 새 인텐트 리스닝, 외부 Activity 실행·결과 수신을 `Intent` 정적 메서드로 제공하는 Capacitor 플러그인. 바코드 스캐너·PDA 등 산업용 디바이스 연동용.

## 사용 트리거 인덱스

- **Intent** — 브로드캐스트 구독·해제·전송, 앱 실행 인텐트 조회, `newIntent` 리스너 등록, `startActivityForResult` 호출을 작성할 때.
- **IntentResult** — 브로드캐스트·실행 인텐트·새 인텐트 콜백 결과의 `action`/`extras` 모양을 타입으로 다룰 때.
- **StartActivityForResultOptions / StartActivityForResultResult** — 외부 Activity 실행 인텐트 옵션과, 결과 코드·결과 인텐트 데이터를 타입으로 맞출 때.
- **IntentPlugin** — `registerPlugin<IntentPlugin>("Intent")` 네이티브/웹 구현이 따라야 하는 플러그인 계약을 확인하거나 구현할 때.

## Intent

`abstract class Intent` — `registerPlugin<IntentPlugin>("Intent")` 로 얻은 플러그인(네이티브 Android / 웹 폴백 `IntentWeb`)을 감싼 정적 API. 인스턴스를 만들지 않고 정적 메서드로만 호출한다.

```ts
Intent.subscribe(filters: string[], callback: (result: IntentResult) => void): Promise<() => Promise<void>>
Intent.unsubscribeAll(): Promise<void>
Intent.send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>
Intent.getLaunchIntent(): Promise<IntentResult>
Intent.addListener(eventName: "newIntent", callback: (result: IntentResult) => void): Promise<PluginListenerHandle>
Intent.removeAllListeners(): Promise<void>
Intent.startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>
```

- `subscribe(filters, callback)` — `filters` 액션 문자열에 맞는 브로드캐스트 수신기를 등록한다. 반환 `Promise` 가 구독 해제 함수(`() => Promise<void>`)로 resolve 되며, 그 함수를 호출하면 등록 시 받은 내부 `id` 로 `unsubscribe` 한다.
  - `filters: string[]` — 수신할 브로드캐스트 액션 필터 배열.
  - `callback: (result: IntentResult) => void` — 매칭 브로드캐스트 수신 시점에 호출된다. 등록 직후 `{ id }` 만 담겨 들어오는 초기 resolve 는 `result.action != null` 검사로 걸러지므로, 콜백은 실제 액션이 있는 결과에 대해서만 호출된다.
- `unsubscribeAll()` — 등록된 모든 브로드캐스트 수신기를 한 번에 구독 해제한다.
- `send(options)` — 브로드캐스트를 전송한다.
  - `options.action: string` — 전송할 브로드캐스트 액션. 필수.
  - `options.extras?: Record<string, unknown>` — 액션과 함께 실어 보낼 추가 데이터. 생략 가능.
- `getLaunchIntent()` — 앱을 띄운 실행 인텐트를 `IntentResult` 로 조회한다(액션/추가 데이터 확인용).
- `addListener("newIntent", callback)` — 앱이 실행 중인 상태에서 새로 들어오는 인텐트 리스너를 등록하고 `PluginListenerHandle` 로 resolve 한다.
  - `eventName: "newIntent"` — 리스닝할 이벤트 이름. 값은 `"newIntent"` 만 허용(앱 실행 중 새 인텐트 수신 이벤트).
  - `callback: (result: IntentResult) => void` — 새 인텐트가 도착한 시점에 호출되며 인텐트 내용을 `IntentResult` 로 받는다.
  - 반환 `PluginListenerHandle` — 이 리스너만 개별 해제하려면 핸들의 `remove()` 를 호출한다.
- `removeAllListeners()` — 등록된 모든 이벤트 리스너를 제거한다.
- `startActivityForResult(options)` — 외부 Activity 를 실행하고 그 결과를 `StartActivityForResultResult` 로 받아온다.
  - `options: StartActivityForResultOptions` — 실행할 인텐트 구성(아래 값 타입 참조).

웹 환경 폴백(`IntentWeb`): `subscribe`/`send`/`startActivityForResult` 는 "웹 환경에서는 지원하지 않습니다" 경고만 남기고 동작하지 않는다(`subscribe` 는 `{ id: "web-stub" }`, `startActivityForResult` 는 `{ resultCode: 0 }` 반환). `unsubscribe`/`unsubscribeAll` 은 no-op, `getLaunchIntent` 은 빈 `{}` 를 반환한다. 실 동작은 Android 네이티브에서만 이뤄진다.

## 값 타입

`Intent` 콜백·옵션·결과에서 공유하는 타입.

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
  data?: {
    action?: string;
    uri?: string;
    extras?: Record<string, unknown>;
  };
}
```

- `IntentResult.action?: string` — 수신/조회된 인텐트의 액션 문자열.
- `IntentResult.extras?: Record<string, unknown>` — 인텐트에 실린 추가 데이터.
- `StartActivityForResultOptions.action?: string` — 실행할 인텐트의 액션.
- `StartActivityForResultOptions.uri?: string` — 인텐트에 실을 URI 문자열.
- `StartActivityForResultOptions.extras?: Record<string, unknown>` — 인텐트에 실을 추가 데이터.
- `StartActivityForResultOptions.type?: string` — 인텐트 MIME type.
- `StartActivityForResultOptions.packageName?: string` — 실행 대상을 특정 앱으로 지정하는 패키지명.
- `StartActivityForResultOptions.className?: string` — 실행 대상을 특정 Activity 로 지정하는 클래스명.
- `StartActivityForResultOptions.flags?: number` — Android Intent flags 숫자값.
- `StartActivityForResultResult.resultCode: number` — 외부 Activity 실행 결과 코드(필수).
- `StartActivityForResultResult.data?: { action?; uri?; extras? }` — 결과로 돌아온 인텐트 데이터 묶음(생략 가능). 내부 `action`/`uri`/`extras` 는 결과 인텐트의 액션/URI/추가 데이터.

## IntentPlugin

`interface IntentPlugin` — `Intent` 정적 API 가 내부에서 호출하는 Capacitor 플러그인 계약. 네이티브(Android)·웹(`IntentWeb`) 구현이 동일 시그니처를 따른다. 직접 호출 대신 보통 `Intent` 를 쓰며, 이 계약은 구현·해석 확인용.

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

- `subscribe(options, callback)` — 수신기를 등록하고 `{ id }`(등록 식별자)로 resolve 한다. `Intent.subscribe` 의 해제 함수가 이 `id` 를 `unsubscribe` 에 넘긴다.
  - `options.filters: string[]` — 수신할 브로드캐스트 액션 필터 배열.
  - `callback: (result: IntentResult) => void` — 수신 결과를 전달받는 콜백.
- `unsubscribe(options)` — 특정 수신기를 해제한다.
  - `options.id: string` — `subscribe` 가 돌려준 해제 대상 식별자.
- `unsubscribeAll()` — 모든 수신기를 해제한다.
- `send(options)` — 브로드캐스트를 전송한다(`options.action` 필수, `options.extras` 선택).
- `getLaunchIntent()` — 실행 인텐트를 `IntentResult` 로 반환한다.
- `addListener("newIntent", listenerFunc)` — 앱 실행 중 새 인텐트 이벤트 리스너를 등록하고 `PluginListenerHandle` 로 resolve 한다.
  - `eventName: "newIntent"` — 허용 값은 `"newIntent"` 뿐(앱 실행 중 새 인텐트 수신 이벤트).
  - `listenerFunc: (data: IntentResult) => void` — 새 인텐트 도착 시점에 호출되는 콜백.
- `removeAllListeners()` — 모든 이벤트 리스너를 제거한다.
- `startActivityForResult(options)` — 외부 Activity 를 실행하고 `StartActivityForResultResult` 로 결과를 반환한다.
