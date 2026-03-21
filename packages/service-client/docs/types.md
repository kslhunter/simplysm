# Types

## ServiceConnectionOptions

WebSocket connection configuration.

```typescript
interface ServiceConnectionOptions {
  port: number;
  host: string;
  ssl?: boolean;
  /** Set to 0 to disable reconnect; disconnects immediately */
  maxReconnectCount?: number;
}
```

## ServiceProgress

Progress callback interface for tracking request/response transfer progress.

```typescript
interface ServiceProgress {
  request?: (s: ServiceProgressState) => void;
  response?: (s: ServiceProgressState) => void;
}
```

## ServiceProgressState

Transfer progress state.

```typescript
interface ServiceProgressState {
  uuid: string;
  totalSize: number;
  completedSize: number;
}
```
