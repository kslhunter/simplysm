# ServiceResponseMessage

서버가 보내는 서비스 메서드 응답 메시지.

```typescript
export interface ServiceResponseMessage {
  name: "response";
  body?: unknown;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"response"` | 고정 문자열 discriminant |
| `body` | `unknown?` | 메서드 실행 결과 (없으면 void) |
