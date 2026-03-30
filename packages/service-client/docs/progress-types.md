# Progress Types

## `ServiceProgress`

Callback hooks for monitoring message progress at different stages.

```typescript
export interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
  server?: (s: ServiceProgressState) => void;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `request` | `(s: ServiceProgressState) => void` | Called during request encoding/sending progress |
| `response` | `(s: ServiceProgressState) => void` | Called during response decoding progress |
| `server` | `(s: ServiceProgressState) => void` | Called when server reports chunk receive progress |

## `ServiceProgressState`

Progress state for a single message transfer.

```typescript
export interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `uuid` | `string` | Message UUID |
| `totalSize` | `number` | Total message size in bytes |
| `completedSize` | `number` | Bytes transferred so far |
