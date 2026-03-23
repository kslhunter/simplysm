# Types

## ISdServiceConnectionConfig

Connection configuration for `SdServiceClient`.

```typescript
interface ISdServiceConnectionConfig {
  port: number;
  host: string;
  ssl?: boolean;
  maxReconnectCount?: number;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `port` | `number` | Server port number |
| `host` | `string` | Server hostname or IP address |
| `ssl` | `boolean` | Whether to use SSL/TLS (`wss://` and `https://`). Defaults to `false` |
| `maxReconnectCount` | `number` | Maximum number of reconnection attempts. Set to `0` to disable reconnect. Defaults to `10` |

---

## ISdServiceProgress

Callback pair for tracking request upload and response download progress.

```typescript
interface ISdServiceProgress {
  request?: (s: ISdServiceProgressState) => void;
  response?: (s: ISdServiceProgressState) => void;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `request` | `(s: ISdServiceProgressState) => void` | Optional callback invoked during request upload progress |
| `response` | `(s: ISdServiceProgressState) => void` | Optional callback invoked during response download progress |

---

## ISdServiceProgressState

Progress state reported by `ISdServiceProgress` callbacks.

```typescript
interface ISdServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | `string` | Unique identifier of the request being tracked |
| `totalSize` | `number` | Total size in bytes of the payload |
| `completedSize` | `number` | Number of bytes transmitted so far |
