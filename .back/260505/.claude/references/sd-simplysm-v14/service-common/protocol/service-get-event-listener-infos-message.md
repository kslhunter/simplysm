# `ServiceGetEventListenerInfosMessage`

> **읽어야 하는 상황**: 등록된 이벤트 리스너 정보를 조회하는 메시지 구조를 파악할 때.

클라이언트가 보내는 이벤트 리스너 정보 목록 요청 메시지.

```typescript
export interface ServiceGetEventListenerInfosMessage {
  name: "evt:gets";
  body: {
    name: string;
  };
}
```

## Members

| Field | Type | Description |
|-------|------|-------------|
| `name` | `"evt:gets"` | 고정 문자열 discriminant |
| `body.name` | `string` | 조회할 이벤트 이름 |
