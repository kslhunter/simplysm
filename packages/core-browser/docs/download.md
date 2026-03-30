# Download

Utility for triggering file downloads in the browser.

## `downloadBlob`

Download a `Blob` as a file by creating a temporary object URL and clicking a hidden anchor element. The object URL is revoked after 1 second.

```typescript
function downloadBlob(blob: Blob, fileName: string): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `blob` | `Blob` | The Blob to download |
| `fileName` | `string` | File name for the download |
