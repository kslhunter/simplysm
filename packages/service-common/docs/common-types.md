# Common Types

## `ServiceUploadResult`

File upload result containing information about the uploaded file.

```typescript
export interface ServiceUploadResult {
  path: string;
  filename: string;
  size: number;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `path` | `string` | Server-side storage path (relative) |
| `filename` | `string` | Original filename |
| `size` | `number` | File size in bytes |
