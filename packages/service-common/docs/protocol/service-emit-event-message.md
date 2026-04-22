# ServiceEmitEventMessage

클라이언트가 보내는 이벤트 발생 메시지.

```typescript
export interface ServiceEmitEventMessage {
  name: "evt:emit";
  body: {
    keys: string[];
    data: unknown;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:emit"` | 고정 문자열 discriminant |
| `body.keys` | `string[]` | 대상 리스너 키 목록 |
| `body.data` | `unknown` | 이벤트 데이터 |
