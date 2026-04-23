# ServiceProgressMessage

서버가 보내는 청크 수신 진행 상태 알림 메시지.

```typescript
export interface ServiceProgressMessage {
  name: "progress";
  body: {
    totalSize: number;
    completedSize: number;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"progress"` | 고정 문자열 discriminant |
| `body.totalSize` | `number` | 전체 메시지 크기 (바이트) |
| `body.completedSize` | `number` | 현재까지 수신 완료된 크기 (바이트) |
