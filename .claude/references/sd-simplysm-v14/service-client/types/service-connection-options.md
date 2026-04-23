# ServiceConnectionOptions

서비스 서버에 연결할 때 사용하는 옵션 인터페이스.

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
