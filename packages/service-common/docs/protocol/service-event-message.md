# ServiceEventMessage

서버가 보내는 이벤트 알림 메시지.

```typescript
export interface ServiceEventMessage {
  name: "evt:on";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:on"` | 고정 문자열 discriminant |
| `body.keys` | `string[]` | 대상 리스너 키 목록 |
| `body.data` | `unknown` | 이벤트 데이터 |
