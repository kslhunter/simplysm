# @simplysm/capacitor-plugin-broadcast

Android Broadcast Intent를 송수신하기 위한 Capacitor 플러그인이다. 바코드 스캐너, PDA 등 산업용 Android 장치와의 연동을 주요 목적으로 설계되었다.

BroadcastReceiver 등록/해제, Intent 전송, 앱 시작 Intent 조회, 새 Intent 수신 리스너 등의 기능을 제공한다.

## 설치

```bash
npm install @simplysm/capacitor-plugin-broadcast
npx cap sync
```

### 요구 사항

| 항목 | 버전 |
|------|------|
| `@capacitor/core` | `^7.4.4` |
| Android `minSdk` | 23 |
| Android `compileSdk` | 35 |

## 지원 플랫폼

| 플랫폼 | 지원 여부 | 비고 |
|--------|----------|------|
| Android | O | 네이티브 BroadcastReceiver 구현 |
| iOS | X | 미지원 |
| Web | 부분 | 스텁 구현 (경고 메시지 출력, 실제 동작 없음) |

## 주요 API

### `Broadcast` 클래스

정적 메서드만으로 구성된 래퍼 클래스이다. 네이티브 플러그인을 직접 사용하지 않고 이 클래스를 통해 접근한다.

| 메서드 | 반환 타입 | 설명 |
|--------|----------|------|
| `subscribe(filters, callback)` | `Promise<() => Promise<void>>` | Broadcast 수신기를 등록하고, 해제 함수를 반환한다 |
| `unsubscribeAll()` | `Promise<void>` | 등록된 모든 Broadcast 수신기를 해제한다 |
| `send(options)` | `Promise<void>` | Broadcast Intent를 전송한다 |
| `getLaunchIntent()` | `Promise<IBroadcastResult>` | 앱을 시작한 Intent 정보를 가져온다 |
| `addNewIntentListener(callback)` | `Promise<PluginListenerHandle>` | 앱 실행 중 새로운 Intent 수신 리스너를 등록한다 |

### `IBroadcastResult` 인터페이스

Broadcast 수신 결과 또는 Intent 정보를 나타내는 인터페이스이다.

| 속성 | 타입 | 설명 |
|------|------|------|
| `action` | `string \| undefined` | Broadcast action 문자열 |
| `extras` | `Record<string, unknown> \| undefined` | Intent에 포함된 추가 데이터 |

## 사용 예시

### Broadcast 수신

특정 action에 대한 Broadcast 수신기를 등록한다. `subscribe`는 해제 함수를 반환하므로 이를 호출하여 수신기를 제거할 수 있다.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// Broadcast 수신 등록
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log("Action:", result.action);
    console.log("Extras:", result.extras);
  },
);

// 수신기 해제
await unsubscribe();
```

여러 action을 동시에 필터링할 수도 있다.

```typescript
const unsubscribe = await Broadcast.subscribe(
  [
    "com.symbol.datawedge.api.RESULT_ACTION",
    "com.symbol.datawedge.api.NOTIFICATION_ACTION",
  ],
  (result) => {
    switch (result.action) {
      case "com.symbol.datawedge.api.RESULT_ACTION":
        // 결과 처리
        break;
      case "com.symbol.datawedge.api.NOTIFICATION_ACTION":
        // 알림 처리
        break;
    }
  },
);
```

### 모든 수신기 해제

등록된 모든 Broadcast 수신기를 한 번에 해제한다. 앱 종료 시 또는 화면 전환 시 정리 용도로 사용한다.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.unsubscribeAll();
```

### Broadcast 전송

다른 앱이나 시스템에 Broadcast Intent를 전송한다. `extras`에 키-값 쌍으로 추가 데이터를 포함할 수 있다.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

`extras`에는 다양한 타입의 값을 포함할 수 있다.

```typescript
await Broadcast.send({
  action: "com.example.MY_ACTION",
  extras: {
    stringValue: "hello",
    numberValue: 42,
    booleanValue: true,
    arrayValue: ["item1", "item2"],
    nestedValue: {
      key: "value",
    },
  },
});
```

### 앱 시작 Intent 조회

앱이 다른 앱의 Intent를 통해 시작된 경우, 해당 Intent 정보를 가져올 수 있다.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const launchIntent = await Broadcast.getLaunchIntent();
if (launchIntent.action != null) {
  console.log("시작 Action:", launchIntent.action);
  console.log("시작 Extras:", launchIntent.extras);
}
```

### 새 Intent 수신 리스너

앱이 이미 실행 중인 상태에서 새로운 Intent를 수신하는 경우를 감지한다. 반환되는 `PluginListenerHandle`의 `remove()` 메서드로 리스너를 해제한다.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const handle = await Broadcast.addNewIntentListener((result) => {
  console.log("새 Intent 수신:", result.action);
  console.log("Extras:", result.extras);
});

// 리스너 해제
await handle.remove();
```

### DataWedge 연동 예시 (Zebra 장치)

산업용 바코드 스캐너(Zebra DataWedge)와 연동하는 실제 사용 패턴이다.

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// 바코드 스캔 결과 수신 등록
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    const barcode = result.extras?.["com.symbol.datawedge.data_string"];
    if (barcode != null) {
      console.log("스캔된 바코드:", barcode);
    }
  },
);

// 소프트 스캔 트리거
await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING",
  },
});
```

## extras 지원 타입

`send()` 호출 시 `extras`에 포함할 수 있는 값의 타입과, 수신 시 변환되는 타입은 다음과 같다.

### 전송 시 (TypeScript -> Android Intent)

| TypeScript 타입 | Android Intent 타입 |
|----------------|-------------------|
| `string` | `String` |
| `number` (정수) | `Integer` |
| `number` (실수) | `Double` |
| `boolean` | `Boolean` |
| `string[]` | `String[]` |
| 중첩 객체 | `Bundle` |

### 수신 시 (Android Intent -> TypeScript)

| Android 타입 | TypeScript 타입 |
|-------------|----------------|
| `String` | `string` |
| `Integer` | `number` |
| `Long` | `number` |
| `Double` | `number` |
| `Float` | `number` |
| `Boolean` | `boolean` |
| `Bundle` | 중첩 객체 |
| `String[]` | `string[]` |
| `int[]` | `number[]` |
| `Parcelable` | `string` (toString) |

## 생명주기 관리

- 플러그인은 Activity가 파괴될 때(`handleOnDestroy`) 등록된 모든 BroadcastReceiver를 자동으로 해제한다.
- Android 13(API 33, Tiramisu) 이상에서는 `RECEIVER_EXPORTED` 플래그를 사용하여 수신기를 등록한다.
- 메모리 누수를 방지하려면 더 이상 필요하지 않은 수신기는 반환된 해제 함수 또는 `unsubscribeAll()`로 해제하는 것을 권장한다.

## 라이선스

MIT
