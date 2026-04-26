# `ServiceAuthMessage`

> **읽어야 하는 상황**: 클라이언트 인증 토큰을 전송할 때.

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
