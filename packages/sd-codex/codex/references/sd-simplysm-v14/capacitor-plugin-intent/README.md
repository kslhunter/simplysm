# @simplysm/capacitor-plugin-intent

> Android Intent를 Capacitor 앱에서 호출하기 위한 플러그인이다. 브로드캐스트 송수신, 앱 실행 인텐트 조회, 실행 중 새 인텐트 리스너, `startActivityForResult`를 제공한다.
> 산업용 Android 디바이스의 바코드 스캐너·PDA 연동처럼 Intent 기반 장비 API를 호출해야 할 때 사용한다. `@capacitor/core ^7`이 peer dependency다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-intent
```

## 하려는 작업 → 읽을 위치

### Android Intent 연동

| 하려는 작업 | 읽을 위치 |
|-------------|-----------|
| 바코드 스캐너·PDA가 보내는 브로드캐스트를 수신한다 | [`Intent`](#intent)의 `subscribe()` |
| 스캔 트리거처럼 액션과 extras를 담은 브로드캐스트를 전송한다 | [`Intent`](#intent)의 `send()` |
| 앱을 실행시킨 Intent 데이터를 조회한다 | [`Intent`](#intent)의 `getLaunchIntent()` |
| 앱 실행 중 새 Intent를 이벤트로 받는다 | [`Intent`](#intent)의 `addListener("newIntent", ...)` |
| 외부 Activity를 열고 결과 코드와 반환 Intent 데이터를 받는다 | [`Intent`](#intent)의 `startActivityForResult()` |
| Capacitor 네이티브 플러그인 구현 타입을 맞춘다 | [`IntentPlugin`](#intentplugin) |

### `Intent`

> **읽어야 하는 상황**: Capacitor 앱에서 Android Intent를 송수신하거나 외부 Activity 결과를 받아야 할 때. 웹 런타임에서 실제 Intent 기능이 필요하면 이 패키지로 해결하지 않는다.

Android 인텐트 플러그인 정적 파사드 클래스.

#### When to use / When NOT to use

- ✅ 산업용 디바이스(바코드 스캐너, PDA)에서 브로드캐스트 수신/전송이 필요할 때
- ✅ 외부 앱(결제 등)을 `startActivityForResult`로 호출하고 결과를 받을 때
- ✅ 딥링크 또는 실행 인텐트 데이터를 조회할 때
- ❌ 브라우저 환경에서 실제 Intent 동작이 필요할 때: 웹 구현은 경고 로그를 남기고 스텁 값을 반환한다

#### Signature

```typescript
export abstract class Intent {
  static async subscribe(
    filters: string[],
    callback: (result: IntentResult) => void,
  ): Promise<() => Promise<void>>;
  static async unsubscribeAll(): Promise<void>;
  static async send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  static async getLaunchIntent(): Promise<IntentResult>;
  static async addListener(
    eventName: "newIntent",
    callback: (result: IntentResult) => void,
  ): Promise<PluginListenerHandle>;
  static async removeAllListeners(): Promise<void>;
  static async startActivityForResult(
    options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult>;
}
```

#### Members

| Member | Kind | Type | 언제 쓰나 |
|--------|------|------|-----------|
| `subscribe` | static method | `(filters: string[], callback: (result: IntentResult) => void) => Promise<() => Promise<void>>` | 액션 필터 배열로 브로드캐스트 수신기를 등록하고 반환 함수로 해제할 때 |
| `unsubscribeAll` | static method | `() => Promise<void>` | `subscribe()`로 등록한 모든 브로드캐스트 수신기를 한 번에 해제할 때 |
| `send` | static method | `(options: { action: string; extras?: Record<string, unknown> }) => Promise<void>` | 액션과 extras를 담아 브로드캐스트를 전송할 때 |
| `getLaunchIntent` | static method | `() => Promise<IntentResult>` | 앱을 시작시킨 Intent의 action/extras를 조회할 때 |
| `addListener` | static method | `(eventName: "newIntent", callback: (result: IntentResult) => void) => Promise<PluginListenerHandle>` | 앱 실행 중 들어오는 새 Intent를 `newIntent` 이벤트로 받을 때 |
| `removeAllListeners` | static method | `() => Promise<void>` | `addListener()`로 등록한 모든 이벤트 리스너를 제거할 때 |
| `startActivityForResult` | static method | `(options: StartActivityForResultOptions) => Promise<StartActivityForResultResult>` | 외부 Activity를 실행하고 `resultCode`와 반환 Intent 데이터를 받을 때 |

#### Usage

##### 최소 예제 — 브로드캐스트 수신

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const unsub = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    if (result.extras != null) {
      // 스캐너가 전달한 extras 처리
    }
  },
);

// 구독 해제
await unsub();
```

##### 전형 예제 — 브로드캐스트 전송

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

##### 전형 예제 — startActivityForResult

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const result = await Intent.startActivityForResult({
  action: "com.example.PAY",
  extras: { amount: 1000 },
});
if (result.resultCode === -1) {
  // Android RESULT_OK. result.data?.extras에서 결과 데이터 추출
}
```

#### 🚫 Anti-patterns

##### `subscribe()` 콜백에서 초기 resolve를 처리

```typescript
// ❌ subscribe가 반환하는 초기 콜백을 처리하려 함
const unsub = await Intent.subscribe(["action"], (result) => {
  processData(result.extras!); // 초기 호출 시 extras가 undefined
});

// ✅ Intent 파사드가 action == null인 초기 resolve를 필터링한다.
//    extras는 브로드캐스트별로 optional이므로 사용 전에 확인한다.
const unsub = await Intent.subscribe(["action"], (result) => {
  if (result.extras != null) {
    processData(result.extras);
  }
});
```

**근거**: Capacitor 플러그인 레벨에서 `subscribe()`는 `{ id }`만 포함된 초기 resolve 콜백을 한 번 호출한다. `Intent` 파사드가 `result.action != null` 조건으로 이를 필터링하지만, extras 접근 시에는 방어적으로 null 체크하는 것이 안전하다.

---

### `IntentResult`

> **읽어야 하는 상황**: 브로드캐스트, 실행 인텐트, 새 인텐트 이벤트 콜백에서 action과 extras를 읽어야 할 때.

브로드캐스트 또는 인텐트 결과 데이터 인터페이스.

```typescript
export interface IntentResult {
  action?: string;
  extras?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | 브로드캐스트 또는 Intent 액션 |
| `extras` | `Record<string, unknown> \| undefined` | 추가 데이터 |

---

### `StartActivityForResultOptions`

> **읽어야 하는 상황**: 외부 Activity 실행에 전달할 action, URI, MIME type, 대상 앱·Activity, flags, extras를 구성해야 할 때.

`startActivityForResult` 호출 시 전달하는 옵션 인터페이스. 모든 필드가 optional이다.

```typescript
export interface StartActivityForResultOptions {
  action?: string;
  uri?: string;
  extras?: Record<string, unknown>;
  type?: string;
  packageName?: string;
  className?: string;
  flags?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | Intent 액션 |
| `uri` | `string \| undefined` | Intent 데이터 URI |
| `extras` | `Record<string, unknown> \| undefined` | 추가 데이터 |
| `type` | `string \| undefined` | MIME type |
| `packageName` | `string \| undefined` | 특정 앱 지정 |
| `className` | `string \| undefined` | 특정 Activity 지정 |
| `flags` | `number \| undefined` | Intent flags |

---

### `StartActivityForResultResult`

> **읽어야 하는 상황**: 외부 Activity 종료 후 성공·취소 여부와 반환 Intent 데이터를 처리해야 할 때.

`startActivityForResult` 호출의 반환 결과 인터페이스.

```typescript
export interface StartActivityForResultResult {
  resultCode: number;
  data?: {
    action?: string;
    uri?: string;
    extras?: Record<string, unknown>;
  };
}
```

| Field | Type | Description |
|-------|------|-------------|
| `resultCode` | `number` | Android Activity 결과 코드 |
| `data` | `object \| undefined` | 결과 데이터 |
| `data.action` | `string \| undefined` | 결과 인텐트 액션 |
| `data.uri` | `string \| undefined` | 결과 인텐트 데이터 URI |
| `data.extras` | `Record<string, unknown> \| undefined` | 결과 인텐트 추가 데이터 |

---

### `IntentPlugin`

> **읽어야 하는 상황**: Capacitor 네이티브 플러그인 구현 또는 테스트 스텁이 공개 플러그인 계약을 만족해야 할 때. 일반 앱 코드는 [`Intent`](#intent) 파사드를 사용한다.

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `Intent` 파사드를 통해 접근한다. 타입 참조 목적으로만 export된다.

```typescript
export interface IntentPlugin {
  subscribe(
    options: { filters: string[] },
    callback: (result: IntentResult) => void,
  ): Promise<{ id: string }>;
  unsubscribe(options: { id: string }): Promise<void>;
  unsubscribeAll(): Promise<void>;
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  getLaunchIntent(): Promise<IntentResult>;
  addListener(
    eventName: "newIntent",
    listenerFunc: (data: IntentResult) => void,
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
  startActivityForResult(
    options: StartActivityForResultOptions,
  ): Promise<StartActivityForResultResult>;
}
```

## 이 패키지를 쓰지 말아야 할 때

- 파일 시스템 접근 → [`@simplysm/capacitor-plugin-file-system`](../capacitor-plugin-file-system/README.md)
- APK 설치 → [`@simplysm/capacitor-plugin-auto-update`](../capacitor-plugin-auto-update/README.md)
- USB 저장 장치 접근 → [`@simplysm/capacitor-plugin-usb-storage`](../capacitor-plugin-usb-storage/README.md)
