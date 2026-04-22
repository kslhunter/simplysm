# ServiceAddEventListenerMessage

클라이언트가 보내는 이벤트 리스너 추가 메시지.

```typescript
export interface ServiceAddEventListenerMessage {
  name: "evt:add";
  body: {
    key: string;
    name: string;
    info: unknown;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:add"` | 고정 문자열 discriminant |
| `body.key` | `string` | 리스너 키 (UUID). `ServiceRemoveEventListenerMessage`에서 사용 |
| `body.name` | `string` | 이벤트 이름 (`ServiceEventDef.eventName`) |
| `body.info` | `unknown` | 이벤트 발생 시 필터링을 위한 추가 리스너 정보 |
