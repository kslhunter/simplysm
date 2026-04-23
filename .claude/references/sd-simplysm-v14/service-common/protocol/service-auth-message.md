# ServiceAuthMessage

클라이언트가 보내는 인증 메시지.

```typescript
export interface ServiceAuthMessage {
  name: "auth";
  body: string;
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"auth"` | 고정 문자열 discriminant |
| `body` | `string` | 인증 토큰 |
