# ServiceErrorMessage

서버가 보내는 에러 알림 메시지.

```typescript
export interface ServiceErrorMessage {
  name: "error";
  body: {
    name: string;
    message: string;
    code: string;
    stack?: string;
    detail?: unknown;
    cause?: unknown;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"error"` | 고정 문자열 discriminant |
| `body.name` | `string` | 에러 이름 (클래스명) |
| `body.message` | `string` | 에러 메시지 |
| `body.code` | `string` | 에러 코드 |
| `body.stack` | `string?` | 스택 트레이스 (선택) |
| `body.detail` | `unknown?` | 추가 상세 정보 (선택) |
| `body.cause` | `unknown?` | 원인 에러 (선택) |
