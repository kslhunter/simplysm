# Types

## `ServiceConnectionOptions`

Connection options for `ServiceClient`.

```typescript
interface ServiceConnectionOptions {
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
| `ssl` | `boolean` | Use SSL/TLS (wss:// and https://) |
| `maxReconnectCount` | `number` | Max reconnect attempts (0 to disable, default: 10) |

## `ServiceProgress`

Progress callback configuration for service requests.

```typescript
interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `request` | `(s: ServiceProgressState) => void` | Request upload progress callback |
| `response` | `(s: ServiceProgressState) => void` | Response download progress callback |

## `ServiceProgressState`

Progress state for chunked message transfers.

```typescript
interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | `string` | Request UUID |
| `totalSize` | `number` | Total message size in bytes |
| `completedSize` | `number` | Completed size in bytes |
