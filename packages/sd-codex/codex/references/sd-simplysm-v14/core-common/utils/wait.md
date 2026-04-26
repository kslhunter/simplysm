# `wait`

> **읽어야 하는 상황**: 조건이 true가 될 때까지 폴링 대기(`until`) 또는 지정 시간만큼 대기(`time`)가 필요할 때.

비동기 대기 유틸리티 네임스페이스.

```typescript
import { wait } from "@simplysm/core-common";
```

## Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `until` | `(forwarder, milliseconds?, maxCount?) => Promise<void>` | 조건이 true가 될 때까지 대기 |
| `time` | `(millisecond: number) => Promise<void>` | 지정된 시간만큼 대기 |

## `until` — Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `forwarder` | `() => boolean \| Promise<boolean>` | - | 조건 함수. 첫 번째 호출에서 true이면 즉시 반환 |
| `milliseconds` | `number` | `100` | 확인 간격 (ms) |
| `maxCount` | `number` | `undefined` | 최대 시도 횟수. 초과 시 `TimeoutError` 발생. 미지정 시 무제한 |

## Usage

```typescript
import { wait } from "@simplysm/core-common";

// 조건 대기
await wait.until(() => isReady);
await wait.until(() => isReady, 100, 50); // 100ms 간격, 최대 50회

// 시간 대기
await wait.time(1000); // 1초 대기
```
