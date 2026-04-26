# `ServiceConnectionOptions`

> **읽어야 하는 상황**: `ServiceClient` 생성자에 전달할 연결 옵션(호스트, 포트, SSL, 재연결 횟수)을 구성할 때.

```typescript
export interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  /** 0으로 설정하면 재연결을 비활성화하고 즉시 연결을 끊음 */
  maxReconnectCount?: number;
}
```

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `port` | `number` | required | 서버 포트 번호 |
| `host` | `string` | required | 서버 호스트 주소 |
| `ssl` | `boolean` | optional | HTTPS/WSS 사용 여부. 기본값 `false` |
| `maxReconnectCount` | `number` | optional | 최대 재연결 횟수. `0`이면 재연결 비활성화. `ServiceClient` 기본값 `10` |
