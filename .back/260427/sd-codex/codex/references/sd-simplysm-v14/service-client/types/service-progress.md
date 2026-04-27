# `ServiceProgress`

> **읽어야 하는 상황**: 요청/응답/서버 처리 진행률을 모니터링할 때. `ServiceClient.send()`의 `progress` 파라미터로 전달한다.

```typescript
export interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
  server?: (s: ServiceProgressState) => void;
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `request` | `(s: ServiceProgressState) => void` | optional | 클라이언트 → 서버 전송 progress |
| `response` | `(s: ServiceProgressState) => void` | optional | 서버 → 클라이언트 수신 progress |
| `server` | `(s: ServiceProgressState) => void` | optional | 서버 내부 처리 progress |

## Related Types

### `ServiceProgressState`

progress 콜백에 전달되는 상태 객체.

```typescript
export interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | `string` | 요청 식별자 |
| `totalSize` | `number` | 전체 크기 (bytes) |
| `completedSize` | `number` | 완료된 크기 (bytes) |
