# Event Definition

## `ServiceEventDef`

Event definition created by `defineEvent()`. `$info` and `$data` are type-only markers (not used at runtime).

```typescript
interface ServiceEventDef<TInfo = unknown, TData = unknown> {
  eventName: string;
  readonly $info: TInfo;
  readonly $data: TData;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | `string` | Event name |
| `$info` | `TInfo` | Type extraction only (listener filter info type) |
| `$data` | `TData` | Type extraction only (event data type) |

## `defineEvent`

Define a service event with type-safe info and data.

```typescript
function defineEvent<TInfo = unknown, TData = unknown>(
  eventName: string,
): ServiceEventDef<TInfo, TData>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `eventName` | `string` | Event name |

## `ServiceUploadResult`

File upload result. Contains information about a file uploaded to the server.

```typescript
interface ServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Storage path on the server |
| `filename` | `string` | Original filename |
| `size` | `number` | File size (bytes) |
