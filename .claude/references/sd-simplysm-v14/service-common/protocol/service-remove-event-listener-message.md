# ServiceRemoveEventListenerMessage

클라이언트가 보내는 이벤트 리스너 제거 메시지.

```typescript
export interface ServiceRemoveEventListenerMessage {
  name: "evt:remove";
  body: {
    key: string;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:remove"` | 고정 문자열 discriminant |
| `body.key` | `string` | 제거할 리스너 키 (UUID) |
