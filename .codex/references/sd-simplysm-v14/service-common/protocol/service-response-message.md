# `ServiceResponseMessage`

> **읽어야 하는 상황**: 서비스 메서드 응답을 처리할 때.

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
