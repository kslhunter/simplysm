# Connection Options

## `ServiceConnectionOptions`

Connection options for the service client.

```typescript
export interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  maxReconnectCount?: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `port` | `number` | Server port |
| `host` | `string` | Server hostname |
| `ssl` | `boolean?` | Enable SSL/TLS (uses `wss://` and `https://` when true) |
| `maxReconnectCount` | `number?` | Maximum reconnection attempts. Set to `0` to disable reconnection and disconnect immediately |
