# @simplysm/capacitor-plugin-intent

Capacitor Intent 플러그인. 브로드캐스트 송수신, 실행 인텐트 조회, 새 인텐트 이벤트 수신, `startActivityForResult`를 제공한다. 산업용 디바이스 연동(바코드 스캐너, PDA 등)을 위해 설계되었다.

## Installation

```bash
npm install @simplysm/capacitor-plugin-intent
```

## API Overview

### 인텐트

| API | Type | Description |
|-----|------|-------------|
| `IntentResult` | interface | 브로드캐스트/인텐트 결과 데이터 |
| `StartActivityForResultOptions` | interface | startActivityForResult 호출 옵션 |
| `StartActivityForResultResult` | interface | startActivityForResult 반환 결과 |
| `IntentPlugin` | interface | Capacitor 네이티브 플러그인 인터페이스 |
| `Intent` | abstract class | 인텐트 플러그인 정적 파사드 |

---

## `IntentResult`

브로드캐스트 또는 인텐트 결과 데이터를 나타내는 인터페이스.

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

## `StartActivityForResultOptions`

`startActivityForResult` 호출 시 전달하는 옵션 인터페이스.

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

## `StartActivityForResultResult`

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
| `resultCode` | `number` | 결과 코드 (`-1`: RESULT_OK, `0`: RESULT_CANCELED) |
| `data` | `object \| undefined` | 결과 데이터 |
| `data.action` | `string \| undefined` | 결과 인텐트 액션 |
| `data.uri` | `string \| undefined` | 결과 인텐트 데이터 URI |
| `data.extras` | `Record<string, unknown> \| undefined` | 결과 인텐트 추가 데이터 |

## `IntentPlugin`

Capacitor 네이티브 플러그인 인터페이스. 직접 사용하지 않고 `Intent` 파사드를 통해 접근한다.

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

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `subscribe` | `{ filters }, callback` | `Promise<{ id: string }>` | 브로드캐스트 수신기 등록 |
| `unsubscribe` | `{ id }` | `Promise<void>` | 특정 수신기 구독 해제 |
| `unsubscribeAll` | 없음 | `Promise<void>` | 모든 수신기 구독 해제 |
| `send` | `{ action, extras? }` | `Promise<void>` | 브로드캐스트 전송 |
| `getLaunchIntent` | 없음 | `Promise<IntentResult>` | 실행 인텐트 조회 |
| `addListener` | `"newIntent", listenerFunc` | `Promise<PluginListenerHandle>` | 새 인텐트 이벤트 리스너 등록 |
| `removeAllListeners` | 없음 | `Promise<void>` | 모든 이벤트 리스너 제거 |
| `startActivityForResult` | `options` | `Promise<StartActivityForResultResult>` | 외부 Activity 실행 후 결과 수신 |

## `Intent`

Android 인텐트 플러그인 정적 파사드 클래스. 브로드캐스트 송수신, 실행 인텐트 조회, 산업용 디바이스 연동을 위한 기능을 제공한다.

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

| Method | Parameters | Return | Description |
|--------|-----------|--------|-------------|
| `subscribe` | `filters: string[], callback` | `Promise<() => Promise<void>>` | 브로드캐스트 수신기 등록. 구독 해제 함수를 반환한다. 초기 resolve 콜백(`action == null`)은 자동 필터링된다. |
| `unsubscribeAll` | 없음 | `Promise<void>` | 모든 브로드캐스트 수신기 구독 해제 |
| `send` | `{ action, extras? }` | `Promise<void>` | 브로드캐스트 전송 |
| `getLaunchIntent` | 없음 | `Promise<IntentResult>` | 앱 실행 인텐트 조회 |
| `addListener` | `"newIntent", callback` | `Promise<PluginListenerHandle>` | 앱 실행 중 수신되는 새 인텐트 이벤트 리스너 등록. `handle.remove()`로 해제한다. |
| `removeAllListeners` | 없음 | `Promise<void>` | 모든 이벤트 리스너 제거 |
| `startActivityForResult` | `options: StartActivityForResultOptions` | `Promise<StartActivityForResultResult>` | 외부 Activity를 실행하고 결과를 수신한다 |

## Usage Examples

### 브로드캐스트 수신 (바코드 스캐너 연동)

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

### 브로드캐스트 전송

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

await Intent.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

### startActivityForResult

```typescript
import { Intent } from "@simplysm/capacitor-plugin-intent";

const result = await Intent.startActivityForResult({
  action: "com.example.PAY",
  extras: { amount: 1000 },
});
if (result.resultCode === -1) {
  // RESULT_OK
}
```
