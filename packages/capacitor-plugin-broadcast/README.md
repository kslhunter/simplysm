# @simplysm/capacitor-plugin-broadcast

Capacitor Android 브로드캐스트 리시버 플러그인. 바코드 스캐너, PDA 등 산업용 기기의 인텐트 브로드캐스트를 수신/발신한다.

## 설치

```bash
npm install @simplysm/capacitor-plugin-broadcast
```

**Peer:** `@capacitor/core` ^7.4.4
**외부 의존성 없음**

## Export 목록

```typescript
// index.ts
export { Broadcast } from "./Broadcast";
export type { BroadcastPlugin, BroadcastResult } from "./BroadcastPlugin";
```

## 주요 사용법

### 브로드캐스트 구독

특정 인텐트 액션 필터로 구독하고, 브로드캐스트 수신 시 콜백을 실행한다.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// 구독 (unsubscribe 함수 반환)
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION", "com.example.SCAN_RESULT"],
  (result) => {
    // result.action: 수신된 액션 이름
    // result.extras: 추가 데이터 (Record<string, unknown>)
  },
);

// 구독 해제
await unsubscribe();

// 전체 구독 해제
await Broadcast.unsubscribeAll();
```

### 브로드캐스트 전송

```typescript
await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

### 런치 인텐트 조회

앱을 시작한 인텐트 정보를 가져온다.

```typescript
const intent = await Broadcast.getLaunchIntent();
// { action?: string, extras?: Record<string, unknown> }
```

### 새 인텐트 리스너

앱이 실행 중일 때 수신되는 새 인텐트를 감지한다 (`onNewIntent`).

```typescript
import type { PluginListenerHandle } from "@capacitor/core";

const handle: PluginListenerHandle = await Broadcast.addListener(
  "newIntent",
  (data) => {
    // data.action, data.extras
  },
);

// 리스너 해제
await handle.remove();

// 전체 리스너 해제
await Broadcast.removeAllListeners();
```

## API 레퍼런스

### `Broadcast` (abstract class, static 메서드)

| 메서드 | 시그니처 | 설명 |
|--------|----------|------|
| `subscribe` | `(filters: string[], callback: (result: BroadcastResult) => void) => Promise<() => Promise<void>>` | 브로드캐스트 구독. unsubscribe 함수 반환 |
| `unsubscribeAll` | `() => Promise<void>` | 모든 구독 해제 |
| `send` | `(options: { action: string; extras?: Record<string, unknown> }) => Promise<void>` | 브로드캐스트 전송 |
| `getLaunchIntent` | `() => Promise<BroadcastResult>` | 런치 인텐트 조회 |
| `addListener` | `(eventName: "newIntent", callback: (result: BroadcastResult) => void) => Promise<PluginListenerHandle>` | 이벤트 리스너 등록 |
| `removeAllListeners` | `() => Promise<void>` | 모든 이벤트 리스너 해제 |

### `BroadcastResult` (interface)

```typescript
interface BroadcastResult {
  action?: string;                    // 브로드캐스트 액션 이름
  extras?: Record<string, unknown>;   // 추가 데이터
}
```

### `BroadcastPlugin` (interface, 저수준)

`Broadcast` 클래스가 래핑하는 Capacitor 플러그인 인터페이스. 직접 사용할 일은 거의 없다.

```typescript
interface BroadcastPlugin {
  subscribe(options: { filters: string[] }, callback: (result: BroadcastResult) => void): Promise<{ id: string }>;
  unsubscribe(options: { id: string }): Promise<void>;
  unsubscribeAll(): Promise<void>;
  send(options: { action: string; extras?: Record<string, unknown> }): Promise<void>;
  getLaunchIntent(): Promise<BroadcastResult>;
  addListener(eventName: "newIntent", listenerFunc: (data: BroadcastResult) => void): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}
```

## 플랫폼 지원

| 기능 | Android | Web |
|------|---------|-----|
| 구독 | BroadcastReceiver + IntentFilter 등록 | 경고 후 스텁 반환 (`id: "web-stub"`) |
| 구독 해제 | `unregisterReceiver` | no-op |
| 전송 | `sendBroadcast(intent)` | 경고 후 no-op |
| 런치 인텐트 | `Activity.getIntent()` | 빈 객체 `{}` 반환 |
| 새 인텐트 | `handleOnNewIntent` -> `notifyListeners` | Capacitor WebPlugin 기본 동작 |

## Android 네이티브 구현

- **패키지:** `kr.co.simplysm.capacitor.broadcast`
- **플러그인명:** `Broadcast`
- `subscribe`: `RETURN_CALLBACK` 방식 (call.setKeepAlive), UUID 기반 receiver ID 관리
- extras 타입 지원: `String`, `Integer`, `Long`, `Double`, `Boolean`, `JSONArray`(-> String[]), `JSONObject`(-> Bundle)
- Intent -> JSON 변환: `Bundle`의 모든 키를 순회하며 타입별 변환 (`Parcelable` -> `toString()` 포함)
- Android 13+: `RECEIVER_EXPORTED` 플래그 사용
- `handleOnDestroy`에서 모든 receiver 자동 해제
