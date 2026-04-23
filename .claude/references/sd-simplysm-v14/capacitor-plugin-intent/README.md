# @simplysm/capacitor-plugin-intent

> Android 인텐트 플러그인. 브로드캐스트 송수신, 실행 인텐트 조회, 새 인텐트 이벤트 수신, `startActivityForResult`를 제공한다. 산업용 디바이스 연동(바코드 스캐너, PDA 등)을 위해 설계되었다. `@capacitor/core ^7` peerDependency. 외부 런타임 의존성 없음.

## Installation

```bash
npm install @simplysm/capacitor-plugin-intent
```

## 하려는 작업 → 먼저 읽을 파일

| 작업 | 먼저 읽을 파일 |
|------|----------------|
| 바코드 스캐너 등 브로드캐스트 수신 | 이 문서의 `Intent.subscribe` |
| 브로드캐스트 전송 (스캔 트리거 등) | 이 문서의 `Intent.send` |
| 외부 Activity 실행 후 결과 수신 | 이 문서의 `Intent.startActivityForResult` |
| 앱 실행 인텐트 데이터 조회 | 이 문서의 `Intent.getLaunchIntent` |

## API Overview

### `Intent`

Android 인텐트 플러그인 정적 파사드 클래스.

#### When to use

- ✅ 산업용 디바이스(바코드 스캐너, PDA)에서 브로드캐스트 수신/전송이 필요할 때
- ✅ 외부 앱(결제 등)을 `startActivityForResult`로 호출하고 결과를 받을 때
- ✅ 딥링크 또는 실행 인텐트 데이터를 조회할 때
- ❌ 브라우저 환경에서 실제 동작 기대 → 웹 폴백은 경고 로그만 표시하고 스텁 값을 반환한다

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

| Member | Kind | Return | Description |
|--------|------|--------|-------------|
| `subscribe` | static method | `Promise<() => Promise<void>>` | 브로드캐스트 수신기 등록. 구독 해제 함수를 반환한다. 초기 resolve 콜백(`action == null`)은 자동 필터링된다. |
| `unsubscribeAll` | static method | `Promise<void>` | 모든 브로드캐스트 수신기 구독 해제 |
| `send` | static method | `Promise<void>` | 브로드캐스트 전송 |
| `getLaunchIntent` | static method | `Promise<IntentResult>` | 앱 실행 인텐트 조회 |
| `addListener` | static method | `Promise<PluginListenerHandle>` | 앱 실행 중 수신되는 새 인텐트 이벤트 리스너 등록. `handle.remove()`로 해제한다. |
| `removeAllListeners` | static method | `Promise<void>` | 모든 이벤트 리스너 제거 |
| `startActivityForResult` | static method | `Promise<StartActivityForResultResult>` | 외부 Activity를 실행하고 결과를 수신한다 |

#### Usage

##### 최소 예제 — 브로드캐스트 수신

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const unsub = await Intent.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    // result.extras에서 스캔 데이터 처리
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
  // RESULT_OK — result.data?.extras에서 결과 데이터 추출
}
```

#### 🚫 Anti-patterns

##### `subscribe()` 콜백에서 초기 resolve를 처리

```typescript
// ❌ subscribe가 반환하는 초기 콜백을 처리하려 함
const unsub = await Intent.subscribe(["action"], (result) => {
  processData(result.extras!); // 초기 호출 시 extras가 undefined
});

// ✅ Intent 파사드가 action == null인 초기 resolve를 이미 필터링한다.
//    콜백은 실제 브로드캐스트만 수신하므로 안전하게 처리 가능.
const unsub = await Intent.subscribe(["action"], (result) => {
  if (result.extras != null) {
    processData(result.extras);
  }
});
```

**근거**: Capacitor 플러그인 레벨에서 `subscribe()`는 `{ id }`만 포함된 초기 resolve 콜백을 한 번 호출한다. `Intent` 파사드가 `result.action != null` 조건으로 이를 필터링하지만, extras 접근 시에는 방어적으로 null 체크하는 것이 안전하다.

---

### `IntentResult`

브로드캐스트 또는 인텐트 결과 데이터 인터페이스.

```typescript
export interface IntentResult {
  action?: string;
  extras?: Record<string, unknown>;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `action` | `string \| undefined` | 브로드캐스트 액션 |
| `extras` | `Record<string, unknown> \| undefined` | 추가 데이터 |

---

### `StartActivityForResultOptions`

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
| `resultCode` | `number` | 결과 코드. `-1`: RESULT_OK, `0`: RESULT_CANCELED |
| `data` | `object \| undefined` | 결과 데이터 |
| `data.action` | `string \| undefined` | 결과 인텐트 액션 |
| `data.uri` | `string \| undefined` | 결과 인텐트 데이터 URI |
| `data.extras` | `Record<string, unknown> \| undefined` | 결과 인텐트 추가 데이터 |

---

### `IntentPlugin`

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
