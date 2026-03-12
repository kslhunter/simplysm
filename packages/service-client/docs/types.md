# Types

Shared type definitions used across the service-client package.

## `ServiceConnectionOptions`

**Interface** -- configuration for connecting to a service server.

```typescript
interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  maxReconnectCount?: number;
}
```

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `port` | `number` | -- | Server port number |
| `host` | `string` | -- | Server hostname or IP |
| `ssl` | `boolean` | `undefined` | Use `wss://` and `https://` when `true` |
| `maxReconnectCount` | `number` | `10` | Maximum reconnection attempts. Set to `0` to disable reconnection (disconnects immediately). |

---

## `ServiceProgress`

**Interface** -- callbacks for monitoring request/response transfer progress.

```typescript
interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `request` | `(s: ServiceProgressState) => void` | Called as request chunks are sent |
| `response` | `(s: ServiceProgressState) => void` | Called as response chunks are received |

---

## `ServiceProgressState`

**Interface** -- progress snapshot for a single transfer operation.

```typescript
interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `uuid` | `string` | Unique identifier for the request |
| `totalSize` | `number` | Total payload size in bytes |
| `completedSize` | `number` | Bytes transferred so far |
