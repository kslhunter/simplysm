# `PROTOCOL_CONFIG`

> **읽어야 하는 상황**: 프로토콜의 크기 제한, 청킹 임계값, GC 주기 등 설정 상수를 참조할 때. 인코딩/디코딩 API는 [`createServiceProtocol`](./create-service-protocol.md) 참조.

서비스 프로토콜 설정 상수.

```typescript
export const PROTOCOL_CONFIG = {
  MAX_TOTAL_SIZE: 100 * 1024 * 1024,
  SPLIT_MESSAGE_SIZE: 3 * 1024 * 1024,
  CHUNK_SIZE: 300 * 1024,
  GC_INTERVAL: 10 * 1000,
  EXPIRE_TIME: 60 * 1000,
} as const;
```

| Field | Type | Description |
|-------|------|-------------|
| `MAX_TOTAL_SIZE` | `number` | 단일 메시지의 최대 허용 크기 (100MB). 초과 시 `ArgumentError` 발생 |
| `SPLIT_MESSAGE_SIZE` | `number` | 이 크기를 초과하면 자동으로 청크 분할 (3MB) |
| `CHUNK_SIZE` | `number` | 분할된 각 청크의 크기 (300KB) |
| `GC_INTERVAL` | `number` | 내부 청크 누적기의 가비지 컬렉션 주기 (10초, 밀리초 단위) |
| `EXPIRE_TIME` | `number` | 미완성 청크 메시지의 만료 시간 (60초). 이 시간 내에 모든 청크가 도착하지 않으면 제거 |
