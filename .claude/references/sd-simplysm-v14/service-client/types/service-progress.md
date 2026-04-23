# ServiceProgress

요청/응답/서버 단계별 progress 콜백을 담는 컨테이너 인터페이스.

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
