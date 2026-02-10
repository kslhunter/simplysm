# @simplysm/capacitor-plugin-broadcast

Android Broadcast 송수신을 위한 Capacitor 플러그인입니다.

산업용 장치(바코드 스캐너, PDA 등)와의 연동을 위해 설계되었습니다.

> ⚠️ **Android 전용** - iOS는 Broadcast 개념이 없어 지원하지 않습니다.

## 설치

```bash
yarn add @simplysm/capacitor-plugin-broadcast
npx cap sync
```

## 사용법

### Broadcast 수신

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// 수신 등록 - 해제 함수 반환
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    console.log("Action:", result.action);
    console.log("Extras:", result.extras);
  }
);

// 수신 해제
await unsubscribe();
```

### Broadcast 송신

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING"
  }
});
```

### 전체 수신기 해제

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

await Broadcast.unsubscribeAll();
```

### 앱 시작 Intent 가져오기

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

const launchIntent = await Broadcast.getLaunchIntent();
console.log(launchIntent.action);
console.log(launchIntent.extras);
```

## API

| 메서드 | 설명 |
|--------|------|
| `subscribe(filters, callback)` | Broadcast 수신 등록, 해제 함수 반환 |
| `unsubscribeAll()` | 모든 수신기 해제 |
| `send({ action, extras })` | Broadcast 송신 |
| `getLaunchIntent()` | 앱 시작 Intent 가져오기 |

## 예제: Zebra DataWedge 연동

```typescript
import { Broadcast } from "@simplysm/capacitor-plugin-broadcast";

// 바코드 스캔 결과 수신
const unsubscribe = await Broadcast.subscribe(
  ["com.symbol.datawedge.api.RESULT_ACTION"],
  (result) => {
    const barcode = result.extras?.["com.symbol.datawedge.data_string"];
    if (barcode) {
      console.log("스캔된 바코드:", barcode);
    }
  }
);

// 소프트 스캔 트리거
await Broadcast.send({
  action: "com.symbol.datawedge.api.ACTION",
  extras: {
    "com.symbol.datawedge.api.SOFT_SCAN_TRIGGER": "TOGGLE_SCANNING"
  }
});
```

## 타입 정의

```typescript
interface IBroadcastResult {
  action?: string;
  extras?: Record<string, unknown>;
}
```

## 라이선스

MIT
