# ServiceRequestMessage

클라이언트가 보내는 서비스 메서드 요청 메시지.

```typescript
export interface ServiceRequestMessage {
  name: `${string}.${string}`;
  body: unknown[];
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `` `${string}.${string}` `` | 서비스명.메서드명 형식 (예: `"OrmService.connect"`) |
| `body` | `unknown[]` | 메서드 매개변수 배열 |
