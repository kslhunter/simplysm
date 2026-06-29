# @simplysm/capacitor-plugin-intent

Android 인텐트 브로드캐스트 송수신, 실행 인텐트 조회, 새 인텐트 리스닝, 외부 Activity 결과 수신을 `Intent` 정적 메서드로 제공하는 Capacitor 플러그인.

## 사용 트리거 인덱스

- **Intent** — 브로드캐스트 구독·해제·전송, 앱 실행 인텐트 조회, `newIntent` 리스너, `startActivityForResult` 호출을 작성할 때.
- **IntentResult** — 브로드캐스트·실행 인텐트·새 인텐트 콜백 결과의 `action`/`extras` 타입을 다룰 때.
- **StartActivityForResultOptions / StartActivityForResultResult** — 외부 Activity 실행 옵션과 결과 코드·결과 인텐트 데이터를 타입으로 맞출 때.
- **IntentPlugin** — `Intent` 내부 `registerPlugin<IntentPlugin>("Intent")` 와 네이티브/웹 플러그인 구현 계약을 확인할 때.

## Intent

`abstract class Intent` — `registerPlugin<IntentPlugin>("Intent")` 로 얻은 플러그인을 감싼 정적 API.

```ts
Intent.subscribe(filters: string[], callback: (result: IntentResult) => void): Promise<() => Promise<void>>
Intent.unsubscribeAll(): Promise<void>
Intent.send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>
Intent.getLaunchIntent(): Promise<IntentResult>
Intent.addListener(eventName: "newIntent", callback: (result: IntentResult) => void): Promise<PluginListenerHandle>
Intent.removeAllListeners(): Promise<void>
Intent.startActivityForResult(options: StartActivityForResultOptions): Promise<StartActivityForResultResult>
```

- `filters: string[]` — 브로드캐스트 수신기 등록에 전달하는 필터 배열.
- `callback: (result: IntentResult) => void` — 브로드캐스트 수신 결과 콜백. `Intent.subscribe` 는 `result.action != null` 인 결과만 호출자 콜백으로 전달한다.
- `Promise<() => Promise<void>>` — 구독 해제 함수. 호출하면 등록 시 받은 `id` 로 `IntentPlugin.unsubscribe({ id })` 를 호출한다.
- `unsubscribeAll()` — 모든 브로드캐스트 수신기 구독 해제.
- `options.action: string` — `send` 가 전송할 브로드캐스트 액션.
- `options.extras?: Record<string, unknown>` — `send` 가 액션과 함께 전달할 추가 데이터.
- `getLaunchIntent()` — 실행 인텐트를 `IntentResult` 로 조회.
- `eventName: "newIntent"` — 앱 실행 중 수신되는 새 인텐트 리스너 이름. 값은 `"newIntent"` 만 허용된다.
- `callback: (result: IntentResult) => void` — `newIntent` 이벤트 데이터 콜백.
- `Promise<PluginListenerHandle>` — `addListener` 의 리스너 핸들. 반환 핸들의 `remove()` 로 해제한다.
- `removeAllListeners()` — 등록된 모든 이벤트 리스너 제거.
- `options: StartActivityForResultOptions` — `startActivityForResult` 로 외부 Activity를 실행할 때 전달하는 인텐트 옵션.
- `Promise<StartActivityForResultResult>` — 외부 Activity 실행 후 반환되는 결과 코드와 선택적 결과 데이터.

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

- `IntentResult.action?: string` — 브로드캐스트 액션.
- `IntentResult.extras?: Record<string, unknown>` — 추가 데이터.
- `StartActivityForResultOptions.action?: string` — 외부 Activity 실행 인텐트의 액션.
- `StartActivityForResultOptions.uri?: string` — 외부 Activity 실행 인텐트에 전달할 URI 문자열.
- `StartActivityForResultOptions.extras?: Record<string, unknown>` — 외부 Activity 실행 인텐트에 전달할 추가 데이터.
- `StartActivityForResultOptions.type?: string` — MIME type.
- `StartActivityForResultOptions.packageName?: string` — 특정 앱 지정 값.
- `StartActivityForResultOptions.className?: string` — 특정 Activity 지정 값.
- `StartActivityForResultOptions.flags?: number` — Android Intent flags 숫자값.
- `StartActivityForResultResult.resultCode: number` — 외부 Activity 실행 결과 코드.
- `StartActivityForResultResult.data?: { ... }` — 결과 인텐트 데이터 묶음.
- `data.action?: string` — 결과 인텐트 액션.
- `data.uri?: string` — 결과 인텐트 URI 문자열.
- `data.extras?: Record<string, unknown>` — 결과 인텐트 추가 데이터.

## IntentPlugin

`interface IntentPlugin` — `Intent` 정적 API가 호출하는 Capacitor 플러그인 계약.

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

- `options.filters: string[]` — 브로드캐스트 수신기 등록에 전달하는 필터 배열.
- `callback: (result: IntentResult) => void` — `subscribe` 가 수신 결과를 전달하는 콜백.
- `Promise<{ id: string }>` — 등록된 수신기 식별자. `Intent.subscribe` 의 반환 해제 함수가 이 값을 `unsubscribe` 에 전달한다.
- `options.id: string` — `unsubscribe` 가 해제할 수신기 식별자.
- `unsubscribeAll()` — 모든 브로드캐스트 수신기 구독 해제.
- `options.action: string` — `send` 가 전송할 브로드캐스트 액션.
- `options.extras?: Record<string, unknown>` — `send` 가 액션과 함께 전달할 추가 데이터.
- `getLaunchIntent()` — 실행 인텐트를 `IntentResult` 로 조회.
- `eventName: "newIntent"` — 앱 실행 중 수신되는 새 인텐트 리스너 이름. 값은 `"newIntent"` 만 허용된다.
- `listenerFunc: (data: IntentResult) => void` — `newIntent` 이벤트 데이터를 받는 콜백.
- `Promise<PluginListenerHandle>` — `addListener` 의 리스너 핸들.
- `removeAllListeners()` — 모든 이벤트 리스너 제거.
- `options: StartActivityForResultOptions` — 외부 Activity 실행에 전달하는 인텐트 옵션.
- `Promise<StartActivityForResultResult>` — 외부 Activity 실행 결과.
